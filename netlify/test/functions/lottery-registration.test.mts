import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));

import handler from '../../routes/guests/lottery-registration.mjs';

function request(method: string, body?: unknown) {
	return new Request('https://example.com/api/lottery-registration', {
		method,
		headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}

function submission(overrides: Record<string, unknown> = {}) {
	return {
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
		answers: {},
		...overrides,
	};
}

afterEach(() => {
	resetDbStub();
});

describe('lottery-registration handler', () => {
	it('returns 405 for unsupported methods', async () => {
		expect((await handler(request('GET'))).status).toBe(405);
	});

	it('rejects invalid submissions before checking the database', async () => {
		const response = await handler(request('POST', { firstName: '' }));

		expect(response.status).toBe(400);
		expect(db.select).not.toHaveBeenCalled();
	});

	it('rejects admin-source submissions', async () => {
		const response = await handler(request('POST', submission({ source: 'admin' })));

		expect(response.status).toBe(400);
		expect(db.select).not.toHaveBeenCalled();
	});

	it('passes a valid self-service registration to lottery business logic', async () => {
		queueResult([]);

		const response = await handler(request('POST', submission()));

		expect(response.status).toBe(409);
		await expect(response.json()).resolves.toEqual({ error: 'Registration is not open.' });
	});
});
