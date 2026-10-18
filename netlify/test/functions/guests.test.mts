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
				body: { pronunciation: 'shi-VAWN', staffNotes: 'Uses a cane.' },
			}),
		);

		// Assert
		expect(response.status).toBe(401);
		expect(db.update).not.toHaveBeenCalled();
	});

	it('saves trimmed details, storing empty ones as null', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([{ pronunciation: 'shi-VAWN', staffNotes: null }]);

		// Act
		const response = await handler(
			request('PATCH', {
				path: `/${guestId}`,
				body: { pronunciation: ' shi-VAWN ', staffNotes: '   ' },
			}),
		);

		// Assert
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ pronunciation: 'shi-VAWN', staffNotes: null });
		const update = vi.mocked(db.update).mock.results[0]!.value as { set: ReturnType<typeof vi.fn> };

		expect(update.set).toHaveBeenCalledWith({ pronunciation: 'shi-VAWN', staffNotes: null });
	});

	it('answers 404 for a guest that does not exist', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([]);

		// Act
		const response = await handler(
			request('PATCH', {
				path: `/${guestId}`,
				body: { pronunciation: '', staffNotes: '' },
			}),
		);

		// Assert
		expect(response.status).toBe(404);
	});

	it('rejects an id that is not a guest id, and notes longer than the field allows', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValue(null);

		// Act
		const badId = await handler(
			request('PATCH', { path: '/visit-1', body: { pronunciation: '', staffNotes: '' } }),
		);
		const tooLong = await handler(
			request('PATCH', {
				path: `/${guestId}`,
				body: { pronunciation: '', staffNotes: 'a'.repeat(2_001) },
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

		for (let table = 0; table < 7; table += 1) {
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
