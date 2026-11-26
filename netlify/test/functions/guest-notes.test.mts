import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));
vi.mock('../../lib/auth.mjs', () => ({ requirePermission: vi.fn() }));

import { requirePermission } from '../../lib/auth.mjs';
import handler from '../../routes/admin/guest-notes.mjs';

const guestId = '6f1c2b8e-4a1d-4f7e-9b2a-3c5d7e9f1a2b';
const noteId = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
const categoryId = '9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b';
const sessionId = '0f1e2d3c-4b5a-4968-8776-655443322110';
const at = new Date('2026-11-26T17:00:00.000Z');

function request(method: string, path: string, body?: unknown) {
	return new Request(`https://example.com/api/admin${path}`, {
		method,
		headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
		body: body !== undefined ? JSON.stringify(body) : undefined,
	});
}

function noteRow(overrides: Record<string, unknown> = {}) {
	return {
		id: noteId,
		guestId,
		marketEventId: sessionId,
		kind: 'text',
		body: 'Uses a cane.',
		categoryId: null,
		categoryLabel: null,
		authorId: null,
		authorName: null,
		createdAt: at,
		updatedAt: at,
		...overrides,
	};
}

afterEach(() => {
	resetDbStub();
	vi.mocked(requirePermission).mockReset();
});

describe('guest notes permissions', () => {
	it.each([
		['GET', `/guests/${guestId}/notes`, 'run:queue'],
		['POST', `/guests/${guestId}/notes`, 'run:queue'],
		['PATCH', `/guest-notes/${noteId}`, 'run:queue'],
		['DELETE', `/guest-notes/${noteId}`, 'run:queue'],
		['GET', '/guest-note-categories', 'run:queue'],
		['POST', '/guest-note-categories', 'manage:guest-notes'],
		['PATCH', `/guest-note-categories/${categoryId}`, 'manage:guest-notes'],
	])('%s %s needs %s before touching the database', async (method, path, permission) => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(Response.json({}, { status: 403 }));

		// Act
		const response = await handler(request(method, path, method === 'GET' ? undefined : {}));

		// Assert
		expect(response.status).toBe(403);
		expect(requirePermission).toHaveBeenCalledWith(expect.any(Request), permission, undefined);
		expect(db.select).not.toHaveBeenCalled();
		expect(db.transaction).not.toHaveBeenCalled();
	});
});

describe('GET /guests/:guestId/notes', () => {
	it('lists the notes, saying a volunteer cannot change one they did not write', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValue(null);
		queueResult([{ id: guestId }]);
		queueResult([{ id: sessionId }]);
		queueResult([noteRow()]);

		// Act
		const response = await handler(request('GET', `/guests/${guestId}/notes`));

		// Assert
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual([
			{ ...noteRow(), createdAt: at.toISOString(), updatedAt: at.toISOString(), editable: false },
		]);
	});

	it('answers 404 for a guest who does not exist', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValue(null);
		queueResult([]);

		// Act
		const response = await handler(request('GET', `/guests/${guestId}/notes`));

		// Assert
		expect(response.status).toBe(404);
	});
});

describe('POST /guests/:guestId/notes', () => {
	it.each([
		['an empty freeform note', { kind: 'text', body: '   ' }],
		['an unknown kind', { kind: 'pinned', body: 'Hi' }],
		['an overlong note', { kind: 'text', body: 'a'.repeat(2_001) }],
		['a category that is not an id', { kind: 'text', body: 'Hi', categoryId: 'warning' }],
	])('rejects %s without touching the database', async (_, body) => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValue(null);

		// Act
		const response = await handler(request('POST', `/guests/${guestId}/notes`, body));

		// Assert
		expect(response.status).toBe(400);
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('files the note under the open session', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValue(null);
		queueResult([{ id: guestId }]);
		queueResult([{ id: sessionId }]);
		queueResult([{ id: noteId }]);
		queueResult([noteRow({ kind: 'screenshot_notice', body: null })]);
		queueResult([{ id: sessionId }]);

		// Act
		const response = await handler(
			request('POST', `/guests/${guestId}/notes`, { kind: 'screenshot_notice' }),
		);

		// Assert
		expect(response.status).toBe(201);
		const insert = vi.mocked(db.insert).mock.results[0]!.value as {
			values: ReturnType<typeof vi.fn>;
		};

		expect(insert.values).toHaveBeenCalledWith(
			expect.objectContaining({
				guestId,
				marketEventId: sessionId,
				kind: 'screenshot_notice',
				body: null,
				categoryId: null,
			}),
		);
	});

	it('refuses a category that has been retired', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValue(null);
		queueResult([{ id: guestId }]);
		queueResult([]);

		// Act
		const response = await handler(
			request('POST', `/guests/${guestId}/notes`, { kind: 'text', body: 'Hi', categoryId }),
		);

		// Assert
		expect(response.status).toBe(400);
		expect(db.insert).not.toHaveBeenCalled();
	});
});

describe('PATCH and DELETE /guest-notes/:noteId', () => {
	it('refuses a worker who neither wrote the note nor holds manage:guest-notes', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValue(null);
		queueResult([
			{ kind: 'text', categoryId: null, authorId: 'auth0|someone', marketEventId: sessionId },
		]);
		queueResult([{ id: sessionId }]);

		// Act
		const response = await handler(request('PATCH', `/guest-notes/${noteId}`, { body: 'Changed' }));

		// Assert
		expect(response.status).toBe(403);
		expect(db.update).not.toHaveBeenCalled();
	});

	it('answers 404 for a note already deleted', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValue(null);
		queueResult([]);

		// Act
		const response = await handler(request('DELETE', `/guest-notes/${noteId}`, {}));

		// Assert
		expect(response.status).toBe(404);
		expect(db.delete).not.toHaveBeenCalled();
	});
});

describe('note categories', () => {
	it('lists them', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValue(null);
		queueResult([{ id: categoryId, label: 'Warning', archivedAt: null }]);

		// Act
		const response = await handler(request('GET', '/guest-note-categories'));

		// Assert
		await expect(response.json()).resolves.toEqual([
			{ id: categoryId, label: 'Warning', archivedAt: null },
		]);
	});

	it('answers 409 for a label already offered', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValue(null);
		const insert = vi.mocked(db.insert);

		insert.mockImplementationOnce(() => {
			throw Object.assign(new Error('duplicate'), { cause: { code: '23505' } });
		});

		// Act
		const response = await handler(request('POST', '/guest-note-categories', { label: 'Warning' }));

		// Assert
		expect(response.status).toBe(409);
	});

	it('retires a category rather than deleting it', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValue(null);
		queueResult([{ id: categoryId, label: 'Warning', archivedAt: at }]);

		// Act
		const response = await handler(
			request('PATCH', `/guest-note-categories/${categoryId}`, { archived: true }),
		);

		// Assert
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			id: categoryId,
			label: 'Warning',
			archivedAt: at.toISOString(),
		});
		expect(db.delete).not.toHaveBeenCalled();
	});

	it('rejects a change that changes nothing', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValue(null);

		// Act
		const response = await handler(request('PATCH', `/guest-note-categories/${categoryId}`, {}));

		// Assert
		expect(response.status).toBe(400);
	});
});
