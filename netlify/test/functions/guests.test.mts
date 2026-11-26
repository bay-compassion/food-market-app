import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));
// History entries are an extra insert in each write's transaction; tested in visit-events.test.mts.
vi.mock('../../services/visit-events.mjs', () => ({
	recordVisitEvents: vi.fn(),
	listVisitEvents: vi.fn(),
	guestActor: { kind: 'guest' },
	systemActor: { kind: 'system' },
}));
vi.mock('../../lib/auth.mjs', () => ({ requirePermission: vi.fn() }));

import { guestDataTables } from '../../../src/services/guest-deletion.js';
import { requirePermission } from '../../lib/auth.mjs';
import handler from '../../routes/admin/guests.mjs';

function request(method: string, options: { path?: string; body?: unknown } = {}) {
	return new Request(`https://example.com/api/admin/guests${options.path ?? ''}`, {
		method,
		headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
		body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
	});
}

afterEach(() => {
	resetDbStub();
	vi.mocked(requirePermission).mockReset();
});

describe('guests handler routing', () => {
	it('returns 405 for unsupported methods', async () => {
		const response = await handler(request('DELETE'));

		expect(response.status).toBe(405);
	});
});

describe('guests handler GET (admin: requires Auth0)', () => {
	it('returns the requirePermission response when unauthorized, without querying guests', async () => {
		const unauthorized = Response.json({ error: 'Authorization required.' }, { status: 401 });

		vi.mocked(requirePermission).mockResolvedValueOnce(unauthorized);

		const response = await handler(request('GET'));

		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toEqual({ error: 'Authorization required.' });
		expect(response.headers.get('Cache-Control')).toBe('no-store');
		expect(db.select).not.toHaveBeenCalled();
	});

	it('lists guests once authorized', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([]);

		const response = await handler(request('GET', { path: '?scope=all' }));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual([]);
	});

	it('lists the whole database one guest per row, counting nothing for a guest with no record', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([
			{
				id: 'visit-9',
				guestId: 'guest-1',
				marketEventId: 'event-1',
				firstName: 'Maria',
				lastName: 'Lopez',
				calledAt: new Date('2026-11-26T18:48:00Z'),
				status: 'called',
				visitCount: 7,
				servedCount: 5,
				noShowCount: 1,
				lastVisitDate: '2026-11-26',
				noteCount: 2,
				latestNoteCategory: 'Escalate to Lead',
			},
			{
				id: null,
				guestId: 'guest-2',
				marketEventId: null,
				firstName: 'Rosa',
				lastName: 'Gutierrez',
				calledAt: null,
				status: null,
				visitCount: null,
				servedCount: null,
				noShowCount: null,
				lastVisitDate: null,
				noteCount: null,
				latestNoteCategory: null,
			},
		]);

		// Act
		const response = await handler(request('GET', { path: '?scope=all' }));

		// Assert
		await expect(response.json()).resolves.toEqual([
			expect.objectContaining({
				guestId: 'guest-1',
				calledAt: '2026-11-26T18:48:00.000Z',
				visitCount: 7,
				noteCount: 2,
				latestNoteCategory: 'Escalate to Lead',
			}),
			expect.objectContaining({
				guestId: 'guest-2',
				visitCount: 0,
				servedCount: 0,
				noShowCount: 0,
				noteCount: 0,
				lastVisitDate: null,
			}),
		]);
	});
});

describe('guests handler PATCH (admin: requires Auth0)', () => {
	it('returns the requirePermission response when unauthorized, without touching the database', async () => {
		const unauthorized = Response.json({ error: 'Authorization required.' }, { status: 401 });

		vi.mocked(requirePermission).mockResolvedValueOnce(unauthorized);

		const response = await handler(request('PATCH', { body: { id: 'visit-1', command: 'serve' } }));

		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toEqual({ error: 'Authorization required.' });
		expect(response.headers.get('Cache-Control')).toBe('no-store');
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('validates the body once authorized', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);

		const response = await handler(request('PATCH', { body: { id: 'visit-1' } }));

		expect(response.status).toBe(400);
	});

	it('rejects a status string now that transitions are expressed as commands', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);

		const response = await handler(request('PATCH', { body: { id: 'visit-1', status: 'served' } }));

		expect(response.status).toBe(400);
	});

	it('rejects a placement other than the front or the back of the line', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);

		const response = await handler(
			request('PATCH', {
				body: { id: 'visit-1', command: 'return_to_queue', placement: 'middle' },
			}),
		);

		expect(response.status).toBe(400);
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('returns a guest to the back of the line when asked to', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([
			{ status: 'no_show', marketEventId: 'event-1', queuePosition: 4, priorityNumber: null },
		]); // current visit
		queueResult([{ id: 'event-1' }]); // the session lock
		queueResult([
			{ highestNumber: 9, highestPriorityNumber: null, highestOrder: 9, othersWaiting: 3 },
		]); // the line so far
		queueResult([{ id: 'visit-1', status: 'waiting' }]); // the update

		const response = await handler(
			request('PATCH', { body: { id: 'visit-1', command: 'return_to_queue', placement: 'end' } }),
		);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ id: 'visit-1', status: 'waiting' });
	});

	it('applies a command that is legal from the current status', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([{ status: 'called' }]); // current visit status
		queueResult([{ id: 'visit-1', status: 'served' }]); // the update

		const response = await handler(request('PATCH', { body: { id: 'visit-1', command: 'serve' } }));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ id: 'visit-1', status: 'served' });
	});

	it('rejects a command that is illegal from the current status', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([{ status: 'waiting' }]); // you cannot serve someone who was never called

		const response = await handler(request('PATCH', { body: { id: 'visit-1', command: 'serve' } }));

		expect(response.status).toBe(409);
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('removes a premarket volunteer, clearing the time they were served', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([{ status: 'served', track: 'premarket' }]); // current visit
		queueResult([{ id: 'visit-1', status: 'cancelled' }]); // the update

		const response = await handler(
			request('PATCH', { body: { id: 'visit-1', command: 'cancel' } }),
		);

		expect(response.status).toBe(200);
		const update = vi.mocked(db.update).mock.results[0]!.value as { set: ReturnType<typeof vi.fn> };

		expect(update.set).toHaveBeenCalledWith({ status: 'cancelled', servedAt: null });
	});

	it('never cancels a guest the line served', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([{ status: 'served', track: 'lottery' }]);

		const response = await handler(
			request('PATCH', { body: { id: 'visit-1', command: 'cancel' } }),
		);

		expect(response.status).toBe(409);
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('returns 404 when the visit does not exist', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([]);

		const response = await handler(request('PATCH', { body: { id: 'missing', command: 'call' } }));

		expect(response.status).toBe(404);
	});
});

describe('guests handler POST (admin only)', () => {
	it('requires Auth0 before inspecting the submission', async () => {
		const unauthorized = Response.json({ error: 'Authorization required.' }, { status: 401 });

		vi.mocked(requirePermission).mockResolvedValueOnce(unauthorized);

		const response = await handler(
			request('POST', {
				body: {
					firstName: 'Ari',
					lastName: 'Guest',
					ageRange: '18-29',
					householdSize: 2,
					childrenCount: 0,
					seniorsCount: 0,
					phone: '555-123-4567',
					locale: 'en',
					source: 'admin',
					marketEventId: 'event-1',
				},
			}),
		);

		expect(response.status).toBe(401);
		await expect(response.json()).resolves.toEqual({ error: 'Authorization required.' });
		expect(response.headers.get('Cache-Control')).toBe('no-store');
		expect(db.select).not.toHaveBeenCalled();
	});

	it('rejects self-service submissions once authorized', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);

		const response = await handler(
			request('POST', {
				body: {
					firstName: 'Ari',
					lastName: 'Guest',
					ageRange: '18-29',
					householdSize: 2,
					childrenCount: 0,
					seniorsCount: 0,
					phone: '555-123-4567',
					locale: 'en',
					deviceToken: null,
					marketEventId: 'event-1',
				},
			}),
		);

		expect(response.status).toBe(400);
		expect(db.select).not.toHaveBeenCalled();
	});
	it('saves details only, with no session and no household, and creates no visit', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([{ id: 'guest-1' }]);

		// Act
		const response = await handler(
			request('POST', {
				body: {
					firstName: 'Ari',
					lastName: 'Guest',
					ageRange: '',
					householdSize: '',
					childrenCount: '',
					seniorsCount: '',
					phone: '555-123-4567',
					locale: 'en',
					source: 'admin',
					admission: 'profile',
					marketEventId: null,
				},
			}),
		);

		// Assert
		expect(response.status).toBe(201);
		await expect(response.json()).resolves.toEqual({ id: null, guestId: 'guest-1' });
		expect(db.insert).toHaveBeenCalledOnce();
		expect(db.select).not.toHaveBeenCalled();
		const stored = (db.insert.mock.results[0]!.value as { values: ReturnType<typeof vi.fn> }).values
			.mock.calls[0]![0];

		expect(stored).toMatchObject({ firstName: 'Ari', deviceTokenHash: null });
	});

	it('still requires a name and phone to save details only', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(null);

		// Act
		const response = await handler(
			request('POST', {
				body: { firstName: 'Ari', locale: 'en', source: 'admin', admission: 'profile' },
			}),
		);

		// Assert
		expect(response.status).toBe(400);
		expect(db.insert).not.toHaveBeenCalled();
	});
});

describe('guests handler GET /guests/:guestId (profile)', () => {
	const guestId = '7d1e1f4a-2c3b-4d5e-8f90-1a2b3c4d5e6f';

	it('returns the guest and their visits, newest first, with timestamps as ISO strings', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([
			{
				guestId,
				firstName: 'Maria',
				lastName: 'Lopez',
				pronunciation: null,
				phone: '(415) 555-0142',
				locale: 'es',
				createdAt: new Date('2025-03-12T17:00:00Z'),
			},
		]);
		queueResult([
			{
				id: 'visit-2',
				visitDate: '2026-11-26',
				status: 'called',
				calledAt: new Date('2026-11-26T18:48:00Z'),
				servedAt: null,
				createdAt: new Date('2026-11-26T17:02:00Z'),
			},
		]);

		// Act
		const response = await handler(request('GET', { path: `/${guestId}` }));

		// Assert
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toMatchObject({
			guestId,
			createdAt: '2025-03-12T17:00:00.000Z',
			visits: [
				{
					id: 'visit-2',
					calledAt: '2026-11-26T18:48:00.000Z',
					servedAt: null,
					createdAt: '2026-11-26T17:02:00.000Z',
				},
			],
		});
	});

	it('answers 404 for a guest that does not exist', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([]);

		// Act
		const response = await handler(request('GET', { path: `/${guestId}` }));

		// Assert
		expect(response.status).toBe(404);
	});

	it('rejects an id that is not a guest id without reading anything', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(null);

		// Act
		const response = await handler(request('GET', { path: '/not-a-uuid' }));

		// Assert
		expect(response.status).toBe(400);
		expect(db.select).not.toHaveBeenCalled();
	});
});

describe('guests handler GET /guests/:guestId/related', () => {
	const guestId = '7d1e1f4a-2c3b-4d5e-8f90-1a2b3c4d5e6f';

	it('lists the records linked by phone, the same person first', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([
			{ guestId, firstName: 'Maria', lastName: 'Lopez', phone: '4155550142' },
			{ guestId: 'same', firstName: 'María', lastName: 'López', phone: '4155550142' },
			{ guestId: 'daughter', firstName: 'Ana', lastName: 'Lopez', phone: '4155550199' },
			{ guestId: 'stranger', firstName: 'Li', lastName: 'Chen', phone: '6505550108' },
		]);
		// The daughter's visit was made with her mother's phone, which links the two.
		queueResult([{ guestId: 'daughter', phone: '4155550142' }]);
		queueResult([
			{
				guestId: 'daughter',
				firstName: 'Ana',
				lastName: 'Lopez',
				phone: '(415) 555-0199',
				createdAt: new Date('2026-01-10T17:00:00Z'),
				visitCount: 2,
				lastVisitDate: '2026-11-12',
			},
			{
				guestId: 'same',
				firstName: 'María',
				lastName: 'López',
				phone: '(415) 555-0142',
				createdAt: new Date('2025-06-04T17:00:00Z'),
				visitCount: 1,
				lastVisitDate: null,
			},
		]);

		// Act
		const response = await handler(request('GET', { path: `/${guestId}/related` }));

		// Assert
		await expect(response.json()).resolves.toEqual([
			expect.objectContaining({ guestId: 'same', relation: 'same-person' }),
			expect.objectContaining({ guestId: 'daughter', relation: 'household', visitCount: 2 }),
		]);
	});

	it('answers an empty list for a guest linked to nobody, without a further read', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([{ guestId, firstName: 'Maria', lastName: 'Lopez', phone: '4155550142' }]);
		queueResult([]);

		// Act
		const response = await handler(request('GET', { path: `/${guestId}/related` }));

		// Assert
		await expect(response.json()).resolves.toEqual([]);
	});

	it('answers 404 for a guest that does not exist', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([]);
		queueResult([]);

		// Act
		const response = await handler(request('GET', { path: `/${guestId}/related` }));

		// Assert
		expect(response.status).toBe(404);
	});
});

describe('guests handler PATCH /guests/:guestId (staff details)', () => {
	const guestId = '6f1c2b8e-4a1d-4f7e-9b2a-3c5d7e9f1a2b';

	it('returns the requirePermission response when unauthorized, without touching the database', async () => {
		// Arrange
		const unauthorized = Response.json({ error: 'Authorization required.' }, { status: 401 });

		vi.mocked(requirePermission).mockResolvedValueOnce(unauthorized);

		// Act
		const response = await handler(
			request('PATCH', {
				path: `/${guestId}`,
				body: { pronunciation: 'shi-VAWN' },
			}),
		);

		// Assert
		expect(response.status).toBe(401);
		expect(db.update).not.toHaveBeenCalled();
	});

	it('saves a trimmed pronunciation, ignoring the retired notes field', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([{ pronunciation: 'shi-VAWN' }]);

		// Act
		const response = await handler(
			request('PATCH', {
				path: `/${guestId}`,
				body: { pronunciation: ' shi-VAWN ', staffNotes: 'Notes have their own endpoints.' },
			}),
		);

		// Assert
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ pronunciation: 'shi-VAWN' });
		const update = vi.mocked(db.update).mock.results[0]!.value as { set: ReturnType<typeof vi.fn> };

		expect(update.set).toHaveBeenCalledWith({ pronunciation: 'shi-VAWN' });
	});

	it('answers 404 for a guest that does not exist', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([]);

		// Act
		const response = await handler(
			request('PATCH', {
				path: `/${guestId}`,
				body: { pronunciation: '' },
			}),
		);

		// Assert
		expect(response.status).toBe(404);
	});

	it('rejects an id that is not a guest id, and a pronunciation longer than the field allows', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValue(null);

		// Act
		const badId = await handler(
			request('PATCH', { path: '/visit-1', body: { pronunciation: '' } }),
		);
		const tooLong = await handler(
			request('PATCH', {
				path: `/${guestId}`,
				body: { pronunciation: 'a'.repeat(101) },
			}),
		);

		// Assert
		expect(badId.status).toBe(400);
		expect(tooLong.status).toBe(400);
		expect(db.update).not.toHaveBeenCalled();
	});
});

describe('guests handler DELETE /guests/:guestId (delete:guest-data)', () => {
	const guestPath = '/7d1e1f4a-2c3b-4d5e-8f90-1a2b3c4d5e6f';

	it('requires the typed phone number before touching the database', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(null);

		// Act
		const response = await handler(request('DELETE', { path: guestPath, body: {} }));

		// Assert
		expect(response.status).toBe(400);
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('refuses with 409 and deletes nothing when the number is not the guest’s', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([
			{ firstName: 'Ari', lastName: 'Guest', phone: '(925) 555-0100', createdAt: new Date() },
		]);

		for (const _table of guestDataTables) {
			queueResult([{ value: 0 }]);
		}
		queueResult([]);

		// Act
		const response = await handler(
			request('DELETE', { path: guestPath, body: { phone: '925-555-0199' } }),
		);

		// Assert
		expect(response.status).toBe(409);
		expect(db.delete).not.toHaveBeenCalled();
	});
});
