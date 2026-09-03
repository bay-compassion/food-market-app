import { describe, expect, it } from 'vitest';

import { createRouter, jsonBody, routeHandler } from './http.mjs';

describe('HTTP request handling', () => {
	it.each([undefined, 'text/plain'])('parses JSON with content type %s', async (contentType) => {
		const app = createRouter();

		app.post('/example', async (context) => Response.json(await jsonBody(context.req.raw)));
		const request = new Request('https://example.com/example', {
			method: 'POST',
			body: '{"accepted":true}',
		});

		if (contentType === undefined) {
			request.headers.delete('content-type');
		} else {
			request.headers.set('content-type', contentType);
		}

		const response = await routeHandler(app)(request);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ accepted: true });
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
