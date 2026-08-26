import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));

import handler from '../../functions/guest-signup.mjs';

function request(method: string, options: { body?: unknown } = {}) {
	return new Request('https://example.com/api/guest-signup', {
		method,
		headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
		body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
	});
}

afterEach(() => {
	resetDbStub();
});

describe('guest-signup handler routing', () => {
	it('returns 405 for unsupported methods', async () => {
		const response = await handler(request('GET'));

		expect(response.status).toBe(405);
	});
});

describe('guest-signup handler POST', () => {
	it('returns 400 for an invalid submission before any database check', async () => {
		const response = await handler(request('POST', { body: { firstName: '' } }));

		expect(response.status).toBe(400);
		expect(db.insert).not.toHaveBeenCalled();
	});

	it('creates a new guest and returns a device token for a first-time sign-up', async () => {
		queueResult([{ id: 'guest-1' }]); // insert guests

		const response = await handler(
			request('POST', {
				body: {
					firstName: 'Ari',
					lastName: 'Guest',
					phone: '555-123-4567',
					locale: 'en',
					deviceToken: null,
				},
			}),
		);

		expect(response.status).toBe(201);
		const body = (await response.json()) as { guestId: string; deviceToken?: string };

		expect(body.guestId).toBe('guest-1');
		expect(body.deviceToken).toBeTruthy();
	});

	it('updates the existing guest and returns no new token for an identified device', async () => {
		const deviceToken = 'device-token-from-this-browser-12345678901234567890';

		queueResult([{ id: 'guest-1', firstName: 'Old' }]); // device credential lookup
		queueResult([{ id: 'guest-1', firstName: 'Renewed' }]); // tx.update guest returning

		const response = await handler(
			request('POST', {
				body: {
					firstName: 'Renewed',
					lastName: 'Guest',
					phone: '555-123-4567',
					locale: 'en',
					deviceToken,
				},
			}),
		);

		expect(response.status).toBe(200);
		const body = (await response.json()) as { guestId: string; deviceToken?: string };

		expect(body.guestId).toBe('guest-1');
		expect(body.deviceToken).toBeUndefined();
	});
});
