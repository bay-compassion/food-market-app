import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../test/dbStub.mjs';

vi.mock('../../db/index.mjs', () => ({ db }));

import { VisitStatusCorrectionService } from './visit-status-correction.mjs';

const marketEventId = '3c9e6a52-1f0b-4c47-9a1e-5b8d2f7e4a10';
const visitId = '0b8f3d2e-6a4c-4e1f-9b7a-3c2d1e0f9a8b';
const actor = { kind: 'worker', id: 'auth0|lead', name: 'Lee' } as const;

function correction() {
	return new VisitStatusCorrectionService(db as never, marketEventId, visitId);
}

/** The values handed to the last `update(...).set(...)`. */
function updatedColumns() {
	const chain = db.update.mock.results.at(-1)?.value as { set: ReturnType<typeof vi.fn> };

	return chain.set.mock.calls.at(-1)?.[0] as Record<string, unknown>;
}

/** The rows handed to the last `insert(...).values(...)`. */
function insertedRows() {
	const chain = db.insert.mock.results.at(-1)?.value as { values: ReturnType<typeof vi.fn> };

	return chain.values.mock.calls.at(-1)?.[0] as Record<string, unknown>[];
}

afterEach(resetDbStub);

describe('VisitStatusCorrectionService', () => {
	it('sets the status and records the correction in the visit’s history', async () => {
		// Arrange
		queueResult([{ status: 'ended' }]);
		queueResult([{ id: visitId, status: 'served' }]);
		queueResult(undefined);

		// Act
		const result = await correction().apply({ from: 'no_show', to: 'served', actor });

		// Assert
		expect(result).toEqual({ ok: true, visit: { id: visitId, status: 'served' } });
		expect(updatedColumns()).toEqual({ status: 'served' });
		expect(insertedRows()).toEqual([
			expect.objectContaining({
				visitId,
				kind: 'corrected',
				toStatus: 'served',
				actorKind: 'worker',
				actorName: 'Lee',
				details: { fromStatus: 'no_show' },
			}),
		]);
	});

	it('clears the service time of a visit corrected away from served', async () => {
		// Arrange
		queueResult([{ status: 'ended' }]);
		queueResult([{ id: visitId, status: 'no_show' }]);
		queueResult(undefined);

		// Act
		await correction().apply({ from: 'served', to: 'no_show', actor });

		// Assert
		expect(updatedColumns()).toEqual({ status: 'no_show', servedAt: null });
	});

	it('refuses a status nobody can be in after a session ends, before touching the database', async () => {
		// Act
		const result = await correction().apply({ from: 'no_show', to: 'waiting', actor });

		// Assert
		expect(result).toMatchObject({ ok: false, status: 409 });
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('refuses a session that has not ended', async () => {
		// Arrange
		queueResult([{ status: 'service_started' }]);

		// Act
		const result = await correction().apply({ from: 'called', to: 'served', actor });

		// Assert
		expect(result).toMatchObject({ ok: false, status: 409 });
		expect(db.update).not.toHaveBeenCalled();
	});

	it('answers 404 for a session that does not exist', async () => {
		// Arrange
		queueResult([]);

		// Act
		const result = await correction().apply({ from: 'no_show', to: 'served', actor });

		// Assert
		expect(result).toMatchObject({ ok: false, status: 404 });
	});

	it('refuses a correction made from a stale list, without recording anything', async () => {
		// Arrange: the update matches nothing, but the visit is in the session.
		queueResult([{ status: 'ended' }]);
		queueResult([]);
		queueResult([{ id: visitId }]);

		// Act
		const result = await correction().apply({ from: 'no_show', to: 'served', actor });

		// Assert
		expect(result).toMatchObject({ ok: false, status: 409 });
		expect(result.ok ? null : result.error).toMatch(/changed since/);
		expect(db.insert).not.toHaveBeenCalled();
	});

	it('answers 404 for a visit that is not in the session', async () => {
		// Arrange
		queueResult([{ status: 'ended' }]);
		queueResult([]);
		queueResult([]);

		// Act
		const result = await correction().apply({ from: 'no_show', to: 'served', actor });

		// Assert
		expect(result).toMatchObject({ ok: false, status: 404 });
	});
});
