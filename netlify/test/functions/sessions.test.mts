import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));
vi.mock('../../lib/auth.mjs', () => ({ requirePermission: vi.fn() }));

const logged = vi.hoisted(() => ({ info: vi.fn() }));

vi.mock('../../lib/logging.mjs', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../lib/logging.mjs')>()),
	getLogger: () => logged,
}));

import { requirePermission } from '../../lib/auth.mjs';
import handler from '../../routes/admin/sessions.mjs';

const sessionId = '3c9e6a52-1f0b-4c47-9a1e-5b8d2f7e4a10';

function request(method: string, options: { path?: string; body?: unknown } = {}) {
	return new Request(`https://example.com/api/admin/sessions${options.path ?? `/${sessionId}`}`, {
		method,
		headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
		body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
	});
}

/** What one preview reads: an ended session, no snapshot, one test-only guest, then the tallies. */
function queueEndedSession({ warehoused = false } = {}) {
	queueResult([
		{
			event: {
				id: sessionId,
				status: 'ended',
				registrationOpensAt: new Date('2026-11-14T17:30:00.000Z'),
				registrationClosesAt: new Date('2026-11-14T17:45:00.000Z'),
			},
			location: {
				id: 'location-1',
				name: 'The Bay Compassion',
				timeZone: 'America/Los_Angeles',
				createdAt: new Date('2026-07-01T00:00:00.000Z'),
			},
		},
	]);
	queueResult(
		warehoused
			? [
					{
						id: 'snapshot-session',
						kind: 'session',
						periodStart: new Date('2026-11-14T17:30:00.000Z'),
						periodEnd: new Date('2026-11-14T17:30:00.001Z'),
						revision: 1,
					},
				]
			: [],
	);
	queueResult([{ guestId: 'guest-test', firstName: 'Tess', lastName: 'Tester' }]);
	queueResult([{ value: 1 }]);

	for (let table = 0; table < 7; table += 1) {
		queueResult([{ value: 1 }]);
	}
	// The one session-only guest's staff notes.
	queueResult([{ value: 1 }]);
}

afterEach(() => {
	resetDbStub();
	vi.mocked(requirePermission).mockReset();
	logged.info.mockReset();
});

describe('sessions handler DELETE /sessions/:sessionId (delete:guest-data)', () => {
	it('passes a refusal from the permission check through without touching the database', async () => {
		// Arrange
		const forbidden = new Response(null, { status: 403 });

		vi.mocked(requirePermission).mockResolvedValueOnce(forbidden);

		// Act
		const response = await handler(
			request('DELETE', { body: { confirmation: '2026-11-14 09:30' } }),
		);

		// Assert
		expect(response.status).toBe(403);
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('requires the typed confirmation and a session id before touching the database', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValue(null);

		// Act
		const noDate = await handler(request('DELETE', { body: {} }));
		const badId = await handler(
			request('DELETE', { path: '/event-1', body: { confirmation: '2026-11-14 09:30' } }),
		);

		// Assert
		expect(noDate.status).toBe(400);
		expect(badId.status).toBe(400);
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('refuses with 409 and deletes nothing when the date and time are not the session’s', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueEndedSession();

		// Act
		const response = await handler(
			request('DELETE', { body: { confirmation: '2026-11-14 14:00' } }),
		);

		// Assert
		expect(response.status).toBe(409);
		expect(db.delete).not.toHaveBeenCalled();
		expect(logged.info).not.toHaveBeenCalled();
	});

	it('deletes the session and logs it by id and row counts, never by guest', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueEndedSession();
		queueResult(undefined); // household_service_entries
		queueResult([]); // kept guests first seen here
		queueResult(undefined); // visits
		queueResult(undefined); // guests
		queueResult(undefined); // market_events

		// Act
		const response = await handler(
			request('DELETE', { body: { confirmation: '2026-11-14 09:30' } }),
		);

		// Assert
		expect(response.status).toBe(204);
		expect(logged.info).toHaveBeenCalledWith(
			expect.objectContaining({ message: 'session.deleted', marketEventId: sessionId }),
		);
		expect(JSON.stringify(logged.info.mock.calls)).not.toContain('Tess');
	});
});

describe('sessions handler DELETE for a warehoused session', () => {
	it('refuses with 409 without force, and deletes nothing', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueEndedSession({ warehoused: true });

		// Act
		const response = await handler(
			request('DELETE', { body: { confirmation: '2026-11-14 09:30' } }),
		);

		// Assert
		expect(response.status).toBe(409);
		expect(db.delete).not.toHaveBeenCalled();
	});

	it('deletes it with force, and logs which snapshots went', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueEndedSession({ warehoused: true });

		for (let table = 0; table < 5; table += 1) {
			queueResult(undefined); // four fact tables, then snapshots
		}
		queueResult(undefined); // household_service_entries
		queueResult([]); // kept guests first seen here
		queueResult(undefined); // visits
		queueResult(undefined); // guests
		queueResult(undefined); // market_events

		// Act
		const response = await handler(
			request('DELETE', { body: { confirmation: '2026-11-14 09:30', force: true } }),
		);

		// Assert
		expect(response.status).toBe(204);
		expect(logged.info).toHaveBeenCalledWith(
			expect.objectContaining({
				message: 'session.deleted',
				forced: true,
				removedSnapshots: [{ id: 'snapshot-session', kind: 'session' }],
			}),
		);
	});
});

describe('sessions handler GET /sessions/:sessionId/deletion (delete:guest-data)', () => {
	it('answers 404 for a session that does not exist', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([]);

		// Act
		const response = await handler(request('GET', { path: `/${sessionId}/deletion` }));

		// Assert
		expect(response.status).toBe(404);
	});
});

describe('sessions handler PATCH /sessions/:sessionId/visits/:visitId (export:guest-data)', () => {
	const visitId = '0b8f3d2e-6a4c-4e1f-9b7a-3c2d1e0f9a8b';
	const path = `/${sessionId}/visits/${visitId}`;

	it('passes a refusal from the permission check through without touching the database', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(new Response(null, { status: 403 }));

		// Act
		const response = await handler(
			request('PATCH', { path, body: { fromStatus: 'no_show', status: 'served' } }),
		);

		// Assert
		expect(response.status).toBe(403);
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('refuses a status it does not know before touching the database', async () => {
		// Act
		const response = await handler(
			request('PATCH', { path, body: { fromStatus: 'no_show', status: 'eaten' } }),
		);

		// Assert
		expect(response.status).toBe(400);
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('corrects the visit and logs who did it', async () => {
		// Arrange
		queueResult([{ status: 'ended' }]);
		queueResult([{ id: visitId, status: 'served' }]);
		queueResult(undefined);

		// Act
		const response = await handler(
			request('PATCH', { path, body: { fromStatus: 'no_show', status: 'served' } }),
		);

		// Assert
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ id: visitId, status: 'served' });
		expect(logged.info).toHaveBeenCalledWith(
			expect.objectContaining({
				message: 'visit.status_corrected',
				visitId,
				fromStatus: 'no_show',
				toStatus: 'served',
			}),
		);
	});

	it('answers 409 with the reason when the session has not ended', async () => {
		// Arrange
		queueResult([{ status: 'service_started' }]);

		// Act
		const response = await handler(
			request('PATCH', { path, body: { fromStatus: 'no_show', status: 'served' } }),
		);

		// Assert
		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({
			error: 'Statuses can only be corrected once the session has ended.',
		});
		expect(logged.info).not.toHaveBeenCalled();
	});

	it('refuses other methods', async () => {
		// Act
		const response = await handler(request('GET', { path }));

		// Assert
		expect(response.status).toBe(405);
	});
});
