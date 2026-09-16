import { afterEach, describe, expect, it, vi } from 'vitest';

import { db } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));
vi.mock('../../lib/auth.mjs', () => ({ requirePermission: vi.fn() }));
vi.mock('../../services/schedule.mjs', () => ({ getSchedule: vi.fn() }));
vi.mock('../../services/schedulePattern.mjs', () => ({
	savePattern: vi.fn(),
	deletePattern: vi.fn(),
	createNextSessionNow: vi.fn(),
}));
vi.mock('../../services/scheduleSessions.mjs', () => ({
	addOneOffSession: vi.fn(),
	updateSession: vi.fn(),
	deleteSession: vi.fn(),
}));

import { requirePermission } from '../../lib/auth.mjs';
import handler from '../../routes/admin/schedule.mjs';
import { getSchedule } from '../../services/schedule.mjs';
import { createNextSessionNow, savePattern } from '../../services/schedulePattern.mjs';
import { deleteSession, updateSession } from '../../services/scheduleSessions.mjs';

const payload = {
	location: { id: 'location-1', name: 'The Bay Church', timeZone: 'America/Los_Angeles' },
	pattern: null,
	sessions: [],
};
const pattern = {
	startsOn: '2026-09-19',
	registrationOpensAt: '10:30',
	registrationDurationMinutes: 60,
	capacity: 30,
	lotteryDelayMinutes: null,
	autoCloseAfterMinutes: 720,
	questions: [],
};

function request(method: string, path = '', body?: unknown) {
	return new Request(`https://example.com/api/admin/schedule${path}`, {
		method,
		headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}

afterEach(() => {
	vi.resetAllMocks();
});

describe('schedule routes', () => {
	it('passes a refusal from the permission gate straight through', async () => {
		// Arrange
		vi.mocked(requirePermission).mockResolvedValueOnce(
			Response.json({ error: 'Forbidden.' }, { status: 403 }),
		);

		// Act
		const response = await handler(request('GET'));

		// Assert
		expect(response.status).toBe(403);
		expect(getSchedule).not.toHaveBeenCalled();
	});

	it('returns the schedule', async () => {
		// Arrange
		vi.mocked(getSchedule).mockResolvedValueOnce(payload);

		// Act
		const response = await handler(request('GET'));

		// Assert
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual(payload);
	});

	it('rejects an invalid pattern without saving anything', async () => {
		// Act
		const response = await handler(
			request('PUT', '/pattern', { ...pattern, registrationOpensAt: '25:00' }),
		);

		// Assert
		expect(response.status).toBe(400);
		expect(savePattern).not.toHaveBeenCalled();
	});

	it('rejects an auto-close that would end the session before the lottery draws', async () => {
		// Act
		const response = await handler(
			request('PUT', '/pattern', {
				...pattern,
				lotteryDelayMinutes: 30,
				autoCloseAfterMinutes: 90,
			}),
		);

		// Assert
		expect(response.status).toBe(400);
		expect(savePattern).not.toHaveBeenCalled();
	});

	it('saves a pattern and answers with the refreshed schedule', async () => {
		// Arrange
		vi.mocked(savePattern).mockResolvedValueOnce({ ok: true });
		vi.mocked(getSchedule).mockResolvedValueOnce(payload);

		// Act
		const response = await handler(request('PUT', '/pattern', pattern));

		// Assert
		expect(response.status).toBe(200);
		expect(savePattern).toHaveBeenCalledWith(pattern);
		await expect(response.json()).resolves.toEqual(payload);
	});

	it('passes a service refusal through as its status', async () => {
		// Arrange
		vi.mocked(createNextSessionNow).mockResolvedValueOnce({
			ok: false,
			status: 409,
			error: 'A session is already scheduled or running.',
		});

		// Act
		const response = await handler(request('POST', '/pattern/next-session'));

		// Assert
		expect(response.status).toBe(409);
		await expect(response.json()).resolves.toEqual({
			error: 'A session is already scheduled or running.',
		});
	});

	it('edits and deletes a session by id', async () => {
		// Arrange
		vi.mocked(updateSession).mockResolvedValueOnce({ ok: true });
		vi.mocked(deleteSession).mockResolvedValueOnce({ ok: true });
		vi.mocked(getSchedule).mockResolvedValue(payload);
		const { startsOn: _startsOn, ...template } = pattern;
		const session = { ...template, date: '2026-09-23' };

		// Act
		const edited = await handler(request('PATCH', '/sessions/event-1', session));
		const deleted = await handler(request('DELETE', '/sessions/event-1'));

		// Assert
		expect(edited.status).toBe(200);
		expect(updateSession).toHaveBeenCalledWith('event-1', session);
		expect(deleted.status).toBe(200);
		expect(deleteSession).toHaveBeenCalledWith('event-1');
	});

	it.each([
		['POST', ''],
		['GET', '/pattern'],
		['PUT', '/sessions'],
		['GET', '/sessions/event-1'],
	])('answers 405 to %s %s', async (method, path) => {
		// Act
		const response = await handler(request(method, path));

		// Assert
		expect(response.status).toBe(405);
	});
});
