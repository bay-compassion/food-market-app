import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../test/dbStub.mjs';

vi.mock('../../db/index.mjs', () => ({ db }));

import { listVisitEvents, recordVisitEvents } from './visit-events.mjs';

/** The rows handed to `insert(...).values(...)`. */
function insertedRows() {
	const chain = db.insert.mock.results.at(-1)?.value as { values: ReturnType<typeof vi.fn> };

	return chain.values.mock.calls.at(-1)?.[0] as Record<string, unknown>[];
}

afterEach(resetDbStub);

describe('recordVisitEvents', () => {
	it('writes nothing for an empty list', async () => {
		await recordVisitEvents(db as never, []);

		expect(db.insert).not.toHaveBeenCalled();
	});

	it('names a worker by id and name, and nobody else', async () => {
		queueResult([]);

		await recordVisitEvents(db as never, [
			{
				visitId: 'visit-1',
				kind: 'called',
				toStatus: 'called',
				actor: { kind: 'worker', id: 'auth0|worker', name: 'Matt' },
			},
			{
				visitId: 'visit-2',
				kind: 'cancelled',
				toStatus: 'cancelled',
				actor: { kind: 'system' },
				details: { cause: 'session_ended' },
			},
		]);

		expect(insertedRows()).toEqual([
			{
				visitId: 'visit-1',
				kind: 'called',
				toStatus: 'called',
				actorKind: 'worker',
				actorId: 'auth0|worker',
				actorName: 'Matt',
				details: {},
			},
			{
				visitId: 'visit-2',
				kind: 'cancelled',
				toStatus: 'cancelled',
				actorKind: 'system',
				actorId: null,
				actorName: null,
				details: { cause: 'session_ended' },
			},
		]);
	});
});

describe('listVisitEvents', () => {
	it('returns the history with each actor in the shape the screen reads', async () => {
		queueResult([
			{
				id: 'event-1',
				visitId: 'visit-1',
				kind: 'registered',
				toStatus: 'registered',
				actorKind: 'guest',
				actorId: null,
				actorName: null,
				details: {},
				createdAt: new Date('2026-10-05T17:00:00.000Z'),
			},
			{
				id: 'event-2',
				visitId: 'visit-1',
				kind: 'called',
				toStatus: 'called',
				actorKind: 'worker',
				actorId: 'auth0|worker',
				actorName: 'Matt',
				details: {},
				createdAt: new Date('2026-10-05T18:00:00.000Z'),
			},
		]);

		const events = await listVisitEvents('visit-1');

		expect(events).toEqual([
			{
				id: 'event-1',
				kind: 'registered',
				toStatus: 'registered',
				actor: { kind: 'guest' },
				details: {},
				createdAt: '2026-10-05T17:00:00.000Z',
			},
			{
				id: 'event-2',
				kind: 'called',
				toStatus: 'called',
				actor: { kind: 'worker', id: 'auth0|worker', name: 'Matt' },
				details: {},
				createdAt: '2026-10-05T18:00:00.000Z',
			},
		]);
	});
});
