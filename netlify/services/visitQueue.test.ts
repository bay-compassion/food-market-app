import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../test/dbStub.js';

vi.mock('../../db/index.js', () => ({ db }));
vi.mock('./pushNotifications.js', () => ({
	notificationsEnabled: () => false,
	deliverPendingNotifications: vi.fn(),
}));

import { runVisitCommand } from './visitQueue.js';

/** The values the command handed to `update(...).set(...)`. */
function lastUpdateValues() {
	const chain = db.update.mock.results.at(-1)?.value as { set: ReturnType<typeof vi.fn> };

	return chain.set.mock.calls.at(-1)?.[0] as Record<string, unknown>;
}

afterEach(resetDbStub);

describe('runVisitCommand timestamps', () => {
	it('stamps served_at when a called guest is served', async () => {
		queueResult([{ status: 'called' }]);
		queueResult([{ id: 'visit-1', status: 'served' }]);

		const result = await runVisitCommand('visit-1', 'serve');

		expect(result.ok).toBe(true);
		expect(lastUpdateValues()).toEqual({ status: 'served', servedAt: expect.any(Date) });
	});

	it('stamps called_at, and nothing else, when a waiting guest is called', async () => {
		queueResult([{ status: 'waiting' }]);
		queueResult([{ id: 'visit-1', status: 'called' }]);

		await runVisitCommand('visit-1', 'call');

		expect(lastUpdateValues()).toEqual({ status: 'called', calledAt: expect.any(Date) });
	});

	it('clears called_at when a guest goes back in the queue', async () => {
		queueResult([{ status: 'called' }]);
		queueResult([{ id: 'visit-1', status: 'waiting' }]);

		await runVisitCommand('visit-1', 'return_to_queue');

		expect(lastUpdateValues()).toEqual({ status: 'waiting', calledAt: null });
	});

	it('leaves both timestamps alone for a command that does not touch service', async () => {
		queueResult([{ status: 'called' }]);
		queueResult([{ id: 'visit-1', status: 'no_show' }]);

		await runVisitCommand('visit-1', 'mark_no_show');

		expect(lastUpdateValues()).toEqual({ status: 'no_show' });
	});
});
