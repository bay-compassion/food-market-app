import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));
vi.mock('../../lib/auth.mjs', () => ({ requirePermission: vi.fn() }));

import { requirePermission } from '../../lib/auth.mjs';
import handler from '../../routes/admin/guest-claims.mjs';

const guestId = '6f1c1c2e-8a4b-4f3e-9d0a-1b2c3d4e5f60';

function request(method: string, body?: unknown) {
	return new Request('https://example.com/api/admin/guest-claims', {
		method,
		headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
		body: body !== undefined ? JSON.stringify(body) : undefined,
	});
}

afterEach(() => {
	resetDbStub();
	vi.mocked(requirePermission).mockReset();
});

describe('guest claims handler (admin: requires Auth0)', () => {
	it('returns the requirePermission response when unauthorized, without touching the database', async () => {
		// Arrange
		const unauthorized = Response.json({ error: 'Authorization required.' }, { status: 401 });

		vi.mocked(requirePermission).mockResolvedValueOnce(unauthorized);

		// Act
		const response = await handler(request('POST', { guestId }));

		// Assert
		expect(response.status).toBe(401);
		expect(response.headers.get('Cache-Control')).toBe('no-store');
		expect(db.select).not.toHaveBeenCalled();
		expect(requirePermission).toHaveBeenCalledWith(expect.anything(), 'run:queue', undefined);
	});

	it('requires a guest id', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(null);

		// Act
		const response = await handler(request('POST', { guestId: 'not-a-uuid' }));

		// Assert
		expect(response.status).toBe(400);
		expect(db.select).not.toHaveBeenCalled();
	});

	it('refuses a guest a phone has already adopted', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([{ deviceTokenHash: 'already-on-a-phone' }]);

		// Act
		const response = await handler(request('POST', { guestId }));

		// Assert
		expect(response.status).toBe(409);
	});

	it('creates a code without caching the response', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(null);
		queueResult([{ deviceTokenHash: null }]);
		queueResult([]);

		// Act
		const response = await handler(request('POST', { guestId }));

		// Assert
		expect(response.status).toBe(201);
		expect(response.headers.get('Cache-Control')).toBe('no-store');
		await expect(response.json()).resolves.toEqual({
			token: expect.any(String),
			expiresAt: expect.any(String),
		});
	});

	it('returns 405 for unsupported methods', async () => {
		// Act
		const response = await handler(request('GET'));

		// Assert
		expect(response.status).toBe(405);
	});
});
