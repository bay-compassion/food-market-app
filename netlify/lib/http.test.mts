import { describe, expect, it, vi } from 'vitest';

import { createRouter, jsonBody, maxRequestBodyBytes, routeHandler } from './http.mjs';

describe('HTTP request handling', () => {
	it.each(['application/json', 'application/json; charset=utf-8', 'Application/JSON'])(
		'parses JSON with content type %s',
		async (contentType) => {
			const app = createRouter();

			app.post('/example', async (context) => Response.json(await jsonBody(context.req.raw)));
			const request = new Request('https://example.com/example', {
				method: 'POST',
				headers: { 'Content-Type': contentType },
				body: '{"accepted":true}',
			});

			const response = await routeHandler(app)(request);

			expect(response.status).toBe(200);
			await expect(response.json()).resolves.toEqual({ accepted: true });
		},
	);

	it.each([undefined, 'text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data'])(
		'rejects JSON disguised as %s',
		async (contentType) => {
			const app = createRouter();

			app.post('/example', async (context) => Response.json(await jsonBody(context.req.raw)));
			const request = new Request('https://example.com/example', {
				method: 'POST',
				body: '{"accepted":true}',
			});

			if (contentType === undefined) {
				request.headers.delete('Content-Type');
			} else {
				request.headers.set('Content-Type', contentType);
			}

			const response = await routeHandler(app)(request);

			expect(response.status).toBe(415);
			await expect(response.json()).resolves.toEqual({
				error: 'Request body must use application/json.',
			});
		},
	);

	it.each([true, false])(
		'rejects oversized bodies (Content-Length present: %s)',
		async (hasLength) => {
			const app = createRouter();
			const reached = vi.fn(() => Response.json({ accepted: true }));
			const body = JSON.stringify({ value: 'x'.repeat(maxRequestBodyBytes) });

			app.post('/example', reached);
			const request = new Request('https://example.com/example', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body,
			});

			if (hasLength) {
				request.headers.set('Content-Length', String(body.length));
			}

			const response = await routeHandler(app)(request);

			expect(response.status).toBe(413);
			await expect(response.json()).resolves.toEqual({ error: 'Request body is too large.' });
			expect(response.headers.get('Cache-Control')).toBe('no-store');
			expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
			expect(reached).not.toHaveBeenCalled();
		},
	);

	it('measures streamed body bytes rather than Unicode character count', async () => {
		const app = createRouter();
		const reached = vi.fn(() => Response.json({ accepted: true }));

		app.post('/example', reached);
		const request = new Request('https://example.com/example', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify('é'.repeat(maxRequestBodyBytes / 2)),
		});

		const response = await routeHandler(app)(request);

		expect(response.status).toBe(413);
		expect(reached).not.toHaveBeenCalled();
	});

	it('preserves a body exactly at the limit through nested routers', async () => {
		const feature = createRouter();
		const body = JSON.stringify('x'.repeat(maxRequestBodyBytes - 2));

		feature.post('/example', async (context) => Response.json(await jsonBody(context.req.raw)));
		const app = createRouter().route('/', feature);
		const request = new Request('https://example.com/example', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body,
		});

		const response = await routeHandler(app)(request);

		expect(response.status).toBe(200);
		await expect(response.text()).resolves.toBe(body);
	});

	it.each([200, 204, 400, 401, 403, 405, 415])(
		'applies security and cache policy to raw %s responses',
		async (status) => {
			const app = createRouter().get('/example', () => new Response(null, { status }));

			const response = await routeHandler(app)(new Request('https://example.com/example'));

			expect(response.status).toBe(status);
			expect(response.headers.get('Cache-Control')).toBe('no-store');
			expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
			expect(response.headers.get('X-Frame-Options')).toBe('DENY');
			expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
			expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
		},
	);

	it('hardens unknown routes and HEAD without dispatching GET', async () => {
		const reached = vi.fn(() => Response.json({ accepted: true }));
		const app = createRouter().get('/example', reached);
		const handler = routeHandler(app);

		const unknown = await handler(new Request('https://example.com/unknown'));
		const head = await handler(new Request('https://example.com/example', { method: 'HEAD' }));

		expect(unknown.status).toBe(404);
		expect(head.status).toBe(405);
		await expect(head.text()).resolves.toBe('');

		for (const response of [unknown, head]) {
			expect(response.headers.get('Cache-Control')).toBe('no-store');
			expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
		}
		expect(reached).not.toHaveBeenCalled();
	});

	it('lets unexpected errors reach the Netlify invocation boundary', async () => {
		const failure = new Error('Database unavailable');
		const feature = createRouter();

		feature.get('/example', () => {
			throw failure;
		});
		const app = createRouter();

		app.route('/', feature);

		const response = routeHandler(app)(new Request('https://example.com/example'));

		await expect(response).rejects.toBe(failure);
	});
});
