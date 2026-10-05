import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../test/dbStub.mjs';

vi.mock('../../db/index.mjs', () => ({ db }));
vi.mock('./pushNotifications.mjs', () => ({
	notificationsEnabled: () => false,
	deliverPendingNotifications: vi.fn(),
}));
vi.mock('./visit-events.mjs', () => ({
	recordVisitEvents: vi.fn(),
	systemActor: { kind: 'system' },
}));

import type { VisitEventActor } from '../../src/services/visit-events.js';
import { recordVisitEvents } from './visit-events.mjs';
import { runVisitCommand } from './visitQueue.mjs';

const actor: VisitEventActor = { kind: 'worker', id: 'auth0|worker', name: 'Matt' };

/** The values the command handed to `update(...).set(...)`. */
function lastUpdateValues() {
	const chain = db.update.mock.results.at(-1)?.value as { set: ReturnType<typeof vi.fn> };

	return chain.set.mock.calls.at(-1)?.[0] as Record<string, unknown>;
}

afterEach(() => {
	resetDbStub();
	vi.mocked(recordVisitEvents).mockClear();
});

describe('runVisitCommand timestamps', () => {
	it('stamps served_at when a called guest is served', async () => {
		queueResult([{ status: 'called' }]);
		queueResult([{ id: 'visit-1', status: 'served' }]);

		const result = await runVisitCommand('visit-1', 'serve', { actor });

		expect(result.ok).toBe(true);
		expect(lastUpdateValues()).toEqual({ status: 'served', servedAt: expect.any(Date) });
	});

	it('stamps called_at, and nothing else, when a waiting guest is called', async () => {
		queueResult([{ status: 'waiting' }]);
		queueResult([{ id: 'visit-1', status: 'called' }]);

		await runVisitCommand('visit-1', 'call', { actor });

		expect(lastUpdateValues()).toEqual({ status: 'called', calledAt: expect.any(Date) });
	});

	it('clears called_at when a guest goes back in the queue', async () => {
		queueResult([{ status: 'called' }]);
		queueResult([{ id: 'visit-1', status: 'waiting' }]);

		await runVisitCommand('visit-1', 'return_to_queue', { actor });

		expect(lastUpdateValues()).toEqual({ status: 'waiting', calledAt: null });
	});

	it('leaves both timestamps alone for a command that does not touch service', async () => {
		queueResult([{ status: 'called' }]);
		queueResult([{ id: 'visit-1', status: 'no_show' }]);

		await runVisitCommand('visit-1', 'mark_no_show', { actor });

		expect(lastUpdateValues()).toEqual({ status: 'no_show' });
	});
});

describe('runVisitCommand return_to_queue placement', () => {
	it('puts a returning guest behind everyone when asked for the back of the line', async () => {
		queueResult([{ status: 'no_show', marketEventId: 'event-1' }]);
		queueResult([{ position: 12 }]);
		queueResult([{ id: 'visit-1', status: 'waiting' }]);

		const result = await runVisitCommand('visit-1', 'return_to_queue', { placement: 'end', actor });

		expect(result.ok).toBe(true);
		expect(lastUpdateValues()).toEqual({ status: 'waiting', calledAt: null, queuePosition: 13 });
	});

	it('puts a returning guest at the front, shifting the waiting guests down', async () => {
		queueResult([{ status: 'no_show', marketEventId: 'event-1' }]);
		queueResult([{ position: 12 }]);
		queueResult([{ position: 5 }]);
		queueResult([]);
		queueResult([{ id: 'visit-1', status: 'waiting' }]);

		await runVisitCommand('visit-1', 'return_to_queue', { placement: 'next', actor });

		expect(lastUpdateValues()).toEqual({ status: 'waiting', calledAt: null, queuePosition: 5 });
	});

	it('keeps the guest’s old place when no placement is given', async () => {
		queueResult([{ status: 'no_show', marketEventId: 'event-1' }]);
		queueResult([{ id: 'visit-1', status: 'waiting' }]);

		await runVisitCommand('visit-1', 'return_to_queue', { actor });

		expect(lastUpdateValues()).toEqual({ status: 'waiting', calledAt: null });
	});

	it('rolls the line back when another worker moved the guest first', async () => {
		queueResult([{ status: 'no_show', marketEventId: 'event-1' }]);
		queueResult([{ position: 12 }]);
		queueResult([{ position: 5 }]);
		queueResult([]);
		queueResult([]);

		const result = await runVisitCommand('visit-1', 'return_to_queue', {
			placement: 'next',
			actor,
		});

		expect(result).toEqual({ ok: false, status: 409, error: expect.any(String) });
		await expect(db.transaction.mock.results.at(-1)?.value).rejects.toThrow();
	});

	it('ignores a placement for any other command', async () => {
		queueResult([{ status: 'called', marketEventId: 'event-1' }]);
		queueResult([{ id: 'visit-1', status: 'served' }]);

		await runVisitCommand('visit-1', 'serve', { placement: 'end', actor });

		expect(lastUpdateValues()).toEqual({ status: 'served', servedAt: expect.any(Date) });
	});
});

describe('runVisitCommand history', () => {
	it('records who ran the command, in the same transaction as the change', async () => {
		queueResult([{ status: 'called', marketEventId: 'event-1' }]);
		queueResult([{ id: 'visit-1', status: 'served' }]);

		await runVisitCommand('visit-1', 'serve', { actor });

		expect(recordVisitEvents).toHaveBeenCalledWith(db, [
			{ visitId: 'visit-1', kind: 'served', toStatus: 'served', actor, details: undefined },
		]);
	});

	it('records where a returned guest was placed', async () => {
		queueResult([{ status: 'no_show', marketEventId: 'event-1' }]);
		queueResult([{ position: 12 }]);
		queueResult([{ id: 'visit-1', status: 'waiting' }]);

		await runVisitCommand('visit-1', 'return_to_queue', { placement: 'end', actor });

		expect(vi.mocked(recordVisitEvents).mock.calls[0]?.[1]).toEqual([
			{
				visitId: 'visit-1',
				kind: 'returned',
				toStatus: 'waiting',
				actor,
				details: { placement: 'end', queuePosition: 13 },
			},
		]);
	});

	it('records nothing when another worker got there first', async () => {
		queueResult([{ status: 'called', marketEventId: 'event-1' }]);
		queueResult([]);

		await runVisitCommand('visit-1', 'serve', { actor });

		expect(recordVisitEvents).not.toHaveBeenCalled();
	});
});
