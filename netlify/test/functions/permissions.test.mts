import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));
vi.mock('../../lib/auth.mjs', () => ({ requirePermission: vi.fn() }));

import { requirePermission } from '../../lib/auth.mjs';
import guestsHandler from '../../routes/guests/guests.mjs';
import lotteryRegistrationHandler from '../../routes/guests/lottery-registration.mjs';
import marketHandler from '../../routes/market/market.mjs';
import queueHandler from '../../routes/market/queue.mjs';
import broadcastHandler from '../../routes/notifications/broadcast.mjs';
import reportsHandler from '../../routes/reports/reports.mjs';

/**
 * Which permission each endpoint asks for.
 *
 * The other function tests mock `requirePermission` and only care that a refusal is passed
 * through. These check the argument — that the queue is gated on `run:queue` and the identifying
 * export on `export:guest-data`, and not the other way round. Getting one of these backwards is
 * exactly the mistake that would hand every volunteer the guest database.
 */

type Handler = (request: Request) => Promise<Response>;

function json(url: string, method: string, body?: unknown) {
	return new Request(url, {
		method,
		headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}

/** Runs a request with the gate refusing, and reports the permission it was asked for. */
async function permissionAskedFor(handler: Handler, request: Request) {
	vi.mocked(requirePermission).mockResolvedValueOnce(
		Response.json({ error: 'nope' }, { status: 403 }),
	);
	await handler(request);
	const call = vi.mocked(requirePermission).mock.calls.at(-1);

	return call?.[1];
}

afterEach(() => {
	resetDbStub();
	vi.mocked(requirePermission).mockReset();
});

describe('endpoint permissions', () => {
	const cases: [name: string, handler: Handler, request: Request, expected: string][] = [
		[
			'reading a report',
			reportsHandler,
			json('https://x/api/reports?report=session-summary&from=2026-01-01&to=2026-08-08', 'GET'),
			'read:reports',
		],
		[
			'exporting every visit',
			reportsHandler,
			json('https://x/api/reports?view=export&from=2026-01-01&to=2026-08-08', 'GET'),
			'export:guest-data',
		],
		['listing guests', guestsHandler, json('https://x/api/guests?scope=all', 'GET'), 'run:queue'],
		[
			'running a visit command',
			guestsHandler,
			json('https://x/api/guests', 'PATCH', { id: 'visit-1', command: 'serve' }),
			'run:queue',
		],
		[
			'adding a guest as a worker',
			guestsHandler,
			json('https://x/api/guests', 'POST', {
				firstName: 'Ana',
				lastName: 'Reyes',
				ageRange: '30-44',
				householdSize: 3,
				childrenCount: 0,
				seniorsCount: 0,
				phone: '5105550123',
				locale: 'en',
				source: 'admin',
				marketEventId: 'event-1',
				answers: {},
			}),
			'run:queue',
		],
		[
			'calling the next guests',
			queueHandler,
			json('https://x/api/queue', 'POST', { action: 'call_next', count: 3 }),
			'run:queue',
		],
		[
			'reading session history',
			marketHandler,
			json('https://x/api/market?view=history', 'GET'),
			'run:queue',
		],
		[
			'closing the day',
			marketHandler,
			json('https://x/api/market', 'POST', { action: 'close_session' }),
			'run:queue',
		],
		[
			'saving session settings',
			marketHandler,
			json('https://x/api/market', 'PUT', { capacity: 50 }),
			'manage:sessions',
		],
		[
			'running the lottery',
			marketHandler,
			json('https://x/api/market', 'POST', { action: 'run_lottery' }),
			'manage:sessions',
		],
		[
			'resetting a session',
			marketHandler,
			json('https://x/api/market', 'POST', { action: 'reset_session' }),
			'manage:sessions',
		],
		[
			'broadcasting to every guest',
			broadcastHandler,
			json('https://x/api/broadcast', 'POST', { title: 'Hi', body: 'We are open' }),
			'manage:sessions',
		],
	];

	for (const [name, handler, request, expected] of cases) {
		it(`gates ${name} on ${expected}`, async () => {
			expect(await permissionAskedFor(handler, request)).toBe(expected);
		});
	}

	it('leaves the guest-facing overview open, with no permission check at all', async () => {
		queueResult([]);

		await marketHandler(json('https://x/api/market', 'GET'));

		expect(requirePermission).not.toHaveBeenCalled();
	});

	it('leaves self-service registration open, with no permission check at all', async () => {
		queueResult([]);

		await lotteryRegistrationHandler(
			json('https://x/api/lottery-registration', 'POST', {
				firstName: 'Ana',
				lastName: 'Reyes',
				ageRange: '30-44',
				householdSize: 3,
				childrenCount: 0,
				seniorsCount: 0,
				phone: '5105550123',
				locale: 'en',
				source: 'self',
				deviceToken: null,
				marketEventId: 'event-1',
				answers: {},
			}),
		);

		expect(requirePermission).not.toHaveBeenCalled();
	});

	it('refuses an unknown market action without revealing that it is unknown', async () => {
		// Gating first means an anonymous caller cannot tell a bad action from a forbidden one.
		vi.mocked(requirePermission).mockResolvedValueOnce(
			Response.json({ error: 'Authorization required.' }, { status: 401 }),
		);

		const response = await marketHandler(
			json('https://x/api/market', 'POST', { action: 'drop_everything' }),
		);

		expect(response.status).toBe(401);
		expect(db.select).not.toHaveBeenCalled();
	});

	it('still rejects an unknown action once the caller is allowed through', async () => {
		vi.mocked(requirePermission).mockResolvedValueOnce(null);

		const response = await marketHandler(
			json('https://x/api/market', 'POST', { action: 'drop_everything' }),
		);

		expect(response.status).toBe(400);
	});
});
