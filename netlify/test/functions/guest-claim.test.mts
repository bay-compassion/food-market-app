import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));

import handler from '../../routes/guests/guest-claim.mjs';

const token = 'claim-token-shown-as-a-qr-code-1234567890abcdef';

function request(method: string, body?: unknown) {
	return new Request('https://example.com/api/guest-claim', {
		method,
		headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
		body: body !== undefined ? JSON.stringify(body) : undefined,
	});
}

afterEach(() => {
	resetDbStub();
});

describe('guest claim handler (public)', () => {
	it('rejects a malformed code before touching the database', async () => {
		// Act
		const response = await handler(request('POST', { token: 'short' }));

		// Assert
		expect(response.status).toBe(400);
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('answers an unknown, expired, or used code with one generic error', async () => {
		// Arrange
		queueResult([]);

		// Act
		const response = await handler(request('POST', { token }));

		// Assert
		expect(response.status).toBe(410);
		await expect(response.json()).resolves.toEqual({
			error: 'This code is no longer valid. Ask a staff member for a new one.',
		});
	});

	it('hands the claimed record to this phone without caching the response', async () => {
		// Arrange
		queueResult([{ id: 'claim-1', guestId: 'guest-1' }]);
		queueResult([]);
		queueResult([{ firstName: 'Ari', lastName: 'Guest', phone: '555-123-4567' }]);
		queueResult([]); // no live session

		// Act
		const response = await handler(request('POST', { token }));

		// Assert
		expect(response.status).toBe(200);
		expect(response.headers.get('Cache-Control')).toBe('no-store');
		await expect(response.json()).resolves.toEqual({
			deviceToken: expect.any(String),
			identity: { firstName: 'Ari', lastName: 'Guest', phone: '555-123-4567' },
			visit: null,
		});
	});

	it('returns 405 for unsupported methods', async () => {
		// Act
		const response = await handler(request('GET'));

		// Assert
		expect(response.status).toBe(405);
	});
});
