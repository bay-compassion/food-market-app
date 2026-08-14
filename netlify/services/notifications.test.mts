import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../test/dbStub.mjs';

vi.mock('../../db/index.mjs', () => ({ db }));
vi.mock('./pushNotifications.mjs', () => ({ deliverPendingNotifications: vi.fn() }));
vi.mock('./smsNotifications.mjs', () => ({ deliverPendingSmsNotifications: vi.fn() }));

import {
	deliverQueuedNotifications,
	queueNotification,
	requeueNotification,
} from './notifications.mjs';
import { deliverPendingNotifications } from './pushNotifications.mjs';
import { deliverPendingSmsNotifications } from './smsNotifications.mjs';

// The dbStub is intentionally untyped, so calls below stand in for the real Drizzle client type
// `queueNotification`/`requeueNotification` expect.
const client = db as never;

/** The rows the last `insert(...).values(...)` call was handed. */
function lastInsertedRows() {
	const chain = db.insert.mock.results.at(-1)?.value as { values: ReturnType<typeof vi.fn> };

	return chain.values.mock.calls.at(-1)?.[0] as Record<string, unknown>[];
}

afterEach(() => {
	resetDbStub();
	vi.mocked(deliverPendingNotifications).mockReset();
	vi.mocked(deliverPendingSmsNotifications).mockReset();
});

describe('queueNotification', () => {
	it('does nothing for an empty visit list', async () => {
		await queueNotification(client, [], 'called', 'called');

		expect(db.insert).not.toHaveBeenCalled();
	});

	it('queues one row per channel per visit, leaving conflicts alone', async () => {
		queueResult(undefined);

		await queueNotification(
			client,
			['visit-1', 'visit-2'],
			'registration_closed',
			'registration_closed',
		);

		const rows = lastInsertedRows();
		expect(rows).toHaveLength(4);
		expect(rows).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ visitId: 'visit-1', channel: 'push' }),
				expect.objectContaining({ visitId: 'visit-1', channel: 'sms' }),
				expect.objectContaining({ visitId: 'visit-2', channel: 'push' }),
				expect.objectContaining({ visitId: 'visit-2', channel: 'sms' }),
			]),
		);
	});

	it('carries custom title and body through to every row', async () => {
		queueResult(undefined);

		await queueNotification(client, ['visit-1'], 'broadcast', 'broadcast:1', {
			title: 'Hi',
			body: 'Hello',
		});

		for (const row of lastInsertedRows()) {
			expect(row).toMatchObject({ title: 'Hi', body: 'Hello' });
		}
	});
});

describe('requeueNotification', () => {
	it('resets an existing row instead of leaving it alone', async () => {
		queueResult(undefined);

		await requeueNotification(client, ['visit-1'], 'called', 'called');

		const chain = db.insert.mock.results.at(-1)?.value as {
			onConflictDoUpdate: ReturnType<typeof vi.fn>;
		};
		expect(chain.onConflictDoUpdate).toHaveBeenCalledWith(
			expect.objectContaining({ set: expect.objectContaining({ status: 'pending' }) }),
		);
	});

	it('queues only the requested channel when given one', async () => {
		queueResult(undefined);

		await requeueNotification(client, ['visit-1'], 'called', 'called', ['push']);

		expect(lastInsertedRows()).toEqual([expect.objectContaining({ channel: 'push' })]);
	});
});

describe('deliverQueuedNotifications', () => {
	it('sums the push and SMS delivery outcomes', async () => {
		vi.mocked(deliverPendingNotifications).mockResolvedValueOnce({
			sent: 2,
			failed: 1,
			skipped: 0,
		});
		vi.mocked(deliverPendingSmsNotifications).mockResolvedValueOnce({
			sent: 1,
			failed: 0,
			skipped: 3,
		});

		const result = await deliverQueuedNotifications({ limit: 250 });

		expect(result).toEqual({ sent: 3, failed: 1, skipped: 3 });
		expect(deliverPendingNotifications).toHaveBeenCalledWith({ limit: 250 });
		expect(deliverPendingSmsNotifications).toHaveBeenCalledWith({ limit: 250 });
	});
});
