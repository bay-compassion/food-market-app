import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../test/dbStub.mjs';

vi.mock('../../db/index.mjs', () => ({ db }));
vi.mock('./pushNotifications.mjs', () => ({
	notificationsEnabled: () => false,
	deliverPendingNotifications: vi.fn(),
}));

import { runVisitCommand } from './visitQueue.mjs';

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

describe('runVisitCommand return_to_queue placement', () => {
	it('puts a returning guest behind everyone when asked for the back of the line', async () => {
		queueResult([{ status: 'no_show', marketEventId: 'event-1' }]);
		queueResult([{ position: 12 }]);
		queueResult([{ id: 'visit-1', status: 'waiting' }]);

		const result = await runVisitCommand('visit-1', 'return_to_queue', { placement: 'end' });

		expect(result.ok).toBe(true);
		expect(lastUpdateValues()).toEqual({ status: 'waiting', calledAt: null, queuePosition: 13 });
	});

	it('puts a returning guest at the front, shifting the waiting guests down', async () => {
		queueResult([{ status: 'no_show', marketEventId: 'event-1' }]);
		queueResult([{ position: 12 }]);
		queueResult([{ position: 5 }]);
		queueResult([]);
		queueResult([{ id: 'visit-1', status: 'waiting' }]);

		await runVisitCommand('visit-1', 'return_to_queue', { placement: 'next' });

		expect(lastUpdateValues()).toEqual({ status: 'waiting', calledAt: null, queuePosition: 5 });
	});

	it('keeps the guest’s old place when no placement is given', async () => {
		queueResult([{ status: 'no_show', marketEventId: 'event-1' }]);
		queueResult([{ id: 'visit-1', status: 'waiting' }]);

		await runVisitCommand('visit-1', 'return_to_queue');

		expect(lastUpdateValues()).toEqual({ status: 'waiting', calledAt: null });
	});

	it('rolls the line back when another worker moved the guest first', async () => {
		queueResult([{ status: 'no_show', marketEventId: 'event-1' }]);
		queueResult([{ position: 12 }]);
		queueResult([{ position: 5 }]);
		queueResult([]);
		queueResult([]);

		const result = await runVisitCommand('visit-1', 'return_to_queue', { placement: 'next' });

		expect(result).toEqual({ ok: false, status: 409, error: expect.any(String) });
		await expect(db.transaction.mock.results.at(-1)?.value).rejects.toThrow();
	});

	it('ignores a placement for any other command', async () => {
		queueResult([{ status: 'called', marketEventId: 'event-1' }]);
		queueResult([{ id: 'visit-1', status: 'served' }]);

		await runVisitCommand('visit-1', 'serve', { placement: 'end' });

		expect(lastUpdateValues()).toEqual({ status: 'served', servedAt: expect.any(Date) });
	});
});
