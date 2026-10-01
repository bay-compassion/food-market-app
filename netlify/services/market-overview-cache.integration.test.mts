// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { GetDeployStoreOptions } from '@netlify/blobs';
import { BlobsServer } from '@netlify/blobs/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const local = vi.hoisted(() => ({ apiURL: '' }));

vi.mock('@netlify/blobs', async (importOriginal) => {
	const sdk = await importOriginal<typeof import('@netlify/blobs')>();

	return {
		...sdk,
		getDeployStore: vi.fn((options: GetDeployStoreOptions) =>
			sdk.getDeployStore({
				...options,
				apiURL: local.apiURL,
				siteID: 'testsite',
				deployID: options.deployID ?? 'testdeploy',
				token: 'testtoken',
			}),
		),
	};
});
vi.mock('./marketSession.mjs', () => ({ marketOverview: vi.fn() }));

import { getDeployStore } from '@netlify/blobs';

import { guestMarketOverview } from './market-overview-cache.mjs';
import { marketOverview } from './marketSession.mjs';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('market cache with the local Netlify Blobs runtime', () => {
	it('refreshes expired snapshots with the local server, isolates deploys, and rejects stale writes', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'market-blobs-'));
		const server = new BlobsServer({ directory, token: 'testtoken', logger: () => {} });
		const empty = { event: null, questions: [], counts: {} };
		let now = Date.now();

		vi.spyOn(Date, 'now').mockImplementation(() => now);
		const warn = vi.spyOn((await import('../lib/logging.mjs')).getLogger(), 'warn');

		vi.mocked(marketOverview).mockResolvedValue(empty);

		try {
			const address = await server.start();

			local.apiURL = `http://localhost:${address.port}`;

			const first = await guestMarketOverview.get();
			const second = await guestMarketOverview.get();

			expect(first).toEqual(empty);
			expect(second).toEqual(empty);
			expect(marketOverview).toHaveBeenCalledTimes(1);

			const store = getDeployStore({ name: 'market-polling', consistency: 'strong' });
			const snapshot = await store.getWithMetadata('overview-v1', { type: 'json' });

			expect(snapshot?.data).toMatchObject({ version: 1, kind: 'snapshot', overview: empty });

			now += 5_000;
			await guestMarketOverview.get();
			await guestMarketOverview.get();

			expect(marketOverview).toHaveBeenCalledTimes(2);
			expect(warn).not.toHaveBeenCalled();
			const refreshed = await store.getWithMetadata('overview-v1', { type: 'json' });

			expect(refreshed?.data).toMatchObject({ kind: 'snapshot', expiresAt: now + 5_000 });

			// A writer can replace the snapshot between the ETag listing and body read.
			// The adapter must return the replacement, never the earlier body with its ETag.
			now += 5_000;
			const replacement = { ...empty, counts: { waiting: 3 } };
			const list = store.list.bind(store);

			vi.spyOn(store, 'list').mockImplementationOnce(async () => {
				const listing = await list({ prefix: 'overview-v1' });

				await store.setJSON('overview-v1', {
					version: 1,
					kind: 'snapshot',
					overview: replacement,
					expiresAt: now + 5_000,
				});

				return listing;
			});
			vi.mocked(getDeployStore).mockReturnValueOnce(store);

			await expect(guestMarketOverview.get()).resolves.toEqual(replacement);
			expect(marketOverview).toHaveBeenCalledTimes(2);
			expect(warn).not.toHaveBeenCalled();

			const staleWrite = await store.setJSON('overview-v1', {}, { onlyIfMatch: 'stale' });
			const preview = getDeployStore({
				name: 'market-polling',
				deployID: 'previewdeploy',
				consistency: 'strong',
			});

			expect(staleWrite.modified).toBe(false);
			expect(await preview.get('overview-v1', { type: 'json' })).toBeNull();
		} finally {
			await server.stop();
			await rm(directory, { recursive: true, force: true });
		}
	});
});
