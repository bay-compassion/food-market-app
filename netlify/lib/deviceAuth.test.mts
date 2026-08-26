import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../test/dbStub.mjs';

vi.mock('../../db/index.mjs', () => ({ db }));

import { authorizedGuest } from './deviceAuth.mjs';

afterEach(resetDbStub);

function request(token?: string) {
	return new Request('https://example.com/api/notification-status', {
		headers: token ? { Authorization: `Bearer ${token}` } : undefined,
	});
}

describe('device authentication', () => {
	it('rejects a missing or malformed device credential without querying the database', async () => {
		await expect(authorizedGuest(request())).resolves.toBeNull();
		await expect(authorizedGuest(request('too-short'))).resolves.toBeNull();
		expect(db.select).not.toHaveBeenCalled();
	});

	it('returns the guest identified by the hashed device credential', async () => {
		queueResult([{ id: 'guest-1' }]);

		await expect(authorizedGuest(request('d'.repeat(43)))).resolves.toEqual({ id: 'guest-1' });
		expect(db.select).toHaveBeenCalledOnce();
	});

	it('rejects a well-formed credential that does not identify a guest', async () => {
		queueResult([]);

		await expect(authorizedGuest(request('d'.repeat(43)))).resolves.toBeNull();
	});
});
