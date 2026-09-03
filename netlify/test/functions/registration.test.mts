import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));

import handler, { config } from '../../functions/registration.mjs';
import { maxRequestBodyBytes } from '../../lib/http.mjs';

const paths = ['/api/guest-information', '/api/lottery-registration'];

afterEach(() => {
	resetDbStub();
});

describe('public registration boundary', () => {
	it('limits only public writes, leaving room for guests sharing a network', () => {
		expect(config.path).toEqual(paths);
		expect(config.rateLimit).toEqual({
			windowLimit: 300,
			windowSize: 60,
			aggregateBy: ['ip', 'domain'],
		});
	});

	it.each(paths)('dispatches JSON to %s', async (path) => {
		const request = new Request(`https://example.com${path}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: '{}',
		});

		const response = await handler(request);

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({
			error:
				path === '/api/guest-information'
					? 'Please provide valid guest information.'
					: 'Please provide a valid lottery registration.',
		});
	});

	it.each(paths)(
		'rejects cross-origin form submissions to %s before database access',
		async (path) => {
			const request = new Request(`https://example.com${path}`, {
				method: 'POST',
				headers: { 'Content-Type': 'text/plain', Origin: 'https://other.example' },
				body: '{}',
			});

			const response = await handler(request);

			expect(response.status).toBe(415);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
			expect(response.headers.get('Cache-Control')).toBe('no-store');
			expect(db.select).not.toHaveBeenCalled();
			expect(db.insert).not.toHaveBeenCalled();
		},
	);

	it.each(paths)('does not enable cross-origin preflights for %s', async (path) => {
		const request = new Request(`https://example.com${path}`, {
			method: 'OPTIONS',
			headers: {
				Origin: 'https://other.example',
				'Access-Control-Request-Method': 'POST',
				'Access-Control-Request-Headers': 'content-type',
			},
		});

		const response = await handler(request);

		expect(response.status).toBe(405);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
		expect(db.select).not.toHaveBeenCalled();
	});

	it.each(paths)('rejects oversized writes to %s before database access', async (path) => {
		const request = new Request(`https://example.com${path}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ firstName: 'x'.repeat(maxRequestBodyBytes) }),
		});

		const response = await handler(request);

		expect(response.status).toBe(413);
		expect(db.select).not.toHaveBeenCalled();
		expect(db.insert).not.toHaveBeenCalled();
	});

	it('handles malformed JSON through nested routers', async () => {
		const request = new Request('https://example.com/api/lottery-registration', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: '{broken',
		});

		const response = await handler(request);

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({ error: 'Request body must be valid JSON.' });
		expect(response.headers.get('Cache-Control')).toBe('no-store');
	});
});
