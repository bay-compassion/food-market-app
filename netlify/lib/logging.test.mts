import { Writable } from 'node:stream';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createRouter, routeHandler, maxRequestBodyBytes } from './http.mjs';
import { createLogger, getLogger, loggedJob, withLogger } from './logging.mjs';

function capture() {
	const records: Record<string, unknown>[] = [];
	const logger = createLogger(
		new Writable({
			write(chunk: Buffer, _encoding, callback) {
				records.push(JSON.parse(chunk.toString()));
				callback();
			},
		}),
	);

	return { records, logger };
}

afterEach(() => vi.unstubAllEnvs());

describe('structured logging', () => {
	it('writes JSON with a stable service, timestamp, and filtered severity', () => {
		vi.stubEnv('LOG_LEVEL', 'warn');
		const { records, logger } = capture();

		logger.info({ message: 'hidden' });
		logger.warn({ message: 'visible' });

		expect(records).toEqual([
			expect.objectContaining({
				message: 'visible',
				level: 'warn',
				service: 'bay-compassion-backend',
				timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
			}),
		]);
	});

	it('falls back to info for an invalid level and supports silent', () => {
		vi.stubEnv('LOG_LEVEL', 'invalid');
		const first = capture();

		vi.stubEnv('LOG_LEVEL', 'silent');
		const second = capture();

		first.logger.info({ message: 'visible' });
		second.logger.error({ message: 'hidden' });

		expect(first.records).toHaveLength(1);
		expect(second.records).toHaveLength(0);
	});

	it('omits request data and error messages, causes, and arbitrary provider properties', () => {
		const { records, logger } = capture();
		const err = Object.assign(new Error('secret SQL parameters', { cause: 'secret cause' }), {
			response: { body: 'secret provider payload' },
		});

		logger.error({
			message: 'failure',
			err,
			req: { headers: 'secret' },
			body: 'secret',
			token: 'secret',
		});

		expect(JSON.stringify(records)).not.toContain('secret');
		expect(records[0]).toMatchObject({ err: { type: 'Error', stack: expect.any(String) } });
	});

	it.each([
		[200, 'info'],
		[401, 'warn'],
		[503, 'error'],
	] as const)(
		'logs one completion for status %s without request credentials or query values',
		async (status, level) => {
			const { records, logger } = capture();
			const app = createRouter().post('/example', () => new Response(null, { status }));
			const request = new Request('https://example.com/example?token=secret', {
				method: 'POST',
				headers: { authorization: 'Bearer secret', 'x-request-id': 'secret' },
				body: 'secret',
			});

			const response = await withLogger(logger, () =>
				routeHandler(app, 'registration')(request, { requestId: 'netlify-id' }),
			);

			expect(records).toHaveLength(1);
			expect(records[0]).toMatchObject({
				message: 'http.completed',
				level,
				status,
				method: 'POST',
				path: '/example',
				function: 'registration',
				requestId: 'netlify-id',
				durationMs: expect.any(Number),
			});
			expect(response.headers.get('X-Request-Id')).toBe('netlify-id');
			expect(JSON.stringify(records)).not.toContain('secret');
		},
	);

	it('logs unknown paths and transport rejections without dispatching the route', async () => {
		const { records, logger } = capture();
		const reached = vi.fn(() => new Response());
		const handler = routeHandler(createRouter().post('/example', reached));

		await withLogger(logger, async () => {
			await handler(new Request('https://example.com/secret'));
			await handler(
				new Request('https://example.com/example', {
					method: 'POST',
					body: 'x'.repeat(maxRequestBodyBytes + 1),
				}),
			);
		});

		expect(records).toHaveLength(2);
		expect(records[0]).toMatchObject({ status: 404, path: '[unmatched]' });
		expect(records[1]).toMatchObject({ status: 413, path: '/example' });
		expect(reached).not.toHaveBeenCalled();
	});

	it('records an unexpected error once and rethrows the original failure', async () => {
		const { records, logger } = capture();
		const failure = new Error('secret database data');
		const feature = createRouter().get('/example', () => {
			throw failure;
		});
		const handler = routeHandler(createRouter().route('/', feature));

		const result = withLogger(logger, () => handler(new Request('https://example.com/example')));

		await expect(result).rejects.toBe(failure);
		expect(records).toHaveLength(1);
		expect(records[0]).toMatchObject({ message: 'http.failed', level: 'error', status: 500 });
		expect(JSON.stringify(records)).not.toContain('secret');
	});

	it('isolates correlation across overlapping requests and restores the parent logger', async () => {
		const { records, logger } = capture();
		const gate = Promise.withResolvers<void>();
		const entered = Promise.withResolvers<void>();
		const app = createRouter().get('/example', async (c) => {
			if (c.req.query('wait')) {
				entered.resolve();
				await gate.promise;
			}
			getLogger().info({ message: 'service.work' });

			return new Response();
		});
		const handler = routeHandler(app);

		await withLogger(logger, async () => {
			const first = handler(new Request('https://example.com/example?wait=1'));

			await entered.promise;
			const second = await handler(new Request('https://example.com/example'));

			gate.resolve();
			const firstResponse = await first;

			expect(firstResponse.headers.get('X-Request-Id')).not.toBe(
				second.headers.get('X-Request-Id'),
			);
			getLogger().info({ message: 'outside' });
		});

		expect(records[0]?.requestId).toBe(records[1]?.requestId);
		expect(records[2]?.requestId).toBe(records[3]?.requestId);
		expect(records[0]?.requestId).not.toBe(records[2]?.requestId);
		expect(records[4]).not.toHaveProperty('requestId');
	});

	it('correlates scheduled work, logs completion, and preserves job failures', async () => {
		const { records, logger } = capture();
		const failure = new Error('secret');
		const success = loggedJob('scheduled', async () => {
			getLogger().info({ message: 'work' });
		});
		const fail = loggedJob('scheduled', async () => {
			throw failure;
		});

		await withLogger(logger, () => success(undefined, { requestId: 'job-id' }));
		await expect(withLogger(logger, () => fail())).rejects.toBe(failure);

		expect(records[0]).toMatchObject({ message: 'work', requestId: 'job-id' });
		expect(records[1]).toMatchObject({ message: 'job.completed', requestId: 'job-id' });
		expect(records[2]).toMatchObject({
			message: 'job.failed',
			level: 'error',
			function: 'scheduled',
		});
		expect(JSON.stringify(records)).not.toContain('secret');
	});
});
