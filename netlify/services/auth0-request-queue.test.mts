import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Auth0RequestQueue } from './auth0-request-queue.mjs';

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date('2026-10-24T00:00:00Z'));
});
afterEach(() => vi.useRealTimers());

describe('Auth0 request pacing', () => {
	it('honors Retry-After before retrying a rate-limited read', async () => {
		// Arrange
		const queue = new Auth0RequestQueue();
		const request = vi
			.fn<() => Promise<Response>>()
			.mockResolvedValueOnce(Response.json({}, { status: 429, headers: { 'Retry-After': '1' } }))
			.mockResolvedValueOnce(Response.json({ ok: true }));

		// Act
		const response = queue.run(request, 'GET');

		await vi.advanceTimersByTimeAsync(1000);

		// Assert
		expect(request).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(100);
		expect((await response).status).toBe(200);
		expect(request).toHaveBeenCalledTimes(2);
	});

	it('paces the next caller when a successful response exhausts the tenant bucket', async () => {
		// Arrange
		const queue = new Auth0RequestQueue();
		const reset = String(Date.now() / 1000 + 1);
		const first = vi.fn(async () =>
			Response.json({}, { headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': reset } }),
		);
		const second = vi.fn(async () => Response.json({}));

		// Act
		await queue.run(first, 'GET');
		const pending = queue.run(second, 'GET');

		await vi.advanceTimersByTimeAsync(1000);

		// Assert
		expect(second).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(100);
		await pending;
		expect(second).toHaveBeenCalledOnce();
	});

	it.each(['POST', 'PATCH', 'DELETE'])('never replays a rate-limited %s', async (method) => {
		// Arrange
		const queue = new Auth0RequestQueue();
		const request = vi.fn(async () => Response.json({}, { status: 429 }));

		// Act
		const response = await queue.run(request, method);

		// Assert
		expect(response.status).toBe(429);
		expect(request).toHaveBeenCalledOnce();
	});

	it('bounds read retries when Auth0 stays rate limited', async () => {
		// Arrange
		const queue = new Auth0RequestQueue();
		const request = vi.fn(async () => Response.json({}, { status: 429 }));

		// Act
		const pending = queue.run(request, 'GET');

		await vi.runAllTimersAsync();

		// Assert
		expect((await pending).status).toBe(429);
		expect(request).toHaveBeenCalledTimes(3);
	});

	it('fails closed without retrying early during a long quota window', async () => {
		// Arrange
		const queue = new Auth0RequestQueue();
		const request = vi.fn(async () =>
			Response.json({}, { status: 429, headers: { 'Retry-After': '60' } }),
		);

		// Act / Assert
		await expect(queue.run(request, 'GET')).rejects.toMatchObject({ status: 503 });
		expect(request).toHaveBeenCalledOnce();
	});
});
