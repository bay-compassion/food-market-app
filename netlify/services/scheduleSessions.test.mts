import { afterEach, describe, expect, it, vi } from 'vitest';

import { MarketLocation } from '../../src/models/market-location.js';
import { db, queueResult, resetDbStub } from '../test/dbStub.mjs';
import { baseEvent } from '../test/marketEventFixture.mjs';

vi.mock('../../db/index.mjs', () => ({ db }));
vi.mock('./marketLocation.mjs', () => ({ currentLocation: vi.fn() }));
vi.mock('./sessionEnding.mjs', () => ({ createNextSession: vi.fn() }));
vi.mock('./sessionTimers.mjs', () => ({
	scheduleSessionTimers: vi.fn(),
	upcomingSessionTimers: ['registration_close', 'auto_close'],
}));

import { currentLocation } from './marketLocation.mjs';
import { addOneOffSession, deleteSession, updateSession } from './scheduleSessions.mjs';
import { createNextSession } from './sessionEnding.mjs';
import { scheduleSessionTimers } from './sessionTimers.mjs';

const location = new MarketLocation({
	id: 'location-1',
	name: 'The Bay Church',
	timeZone: 'America/Los_Angeles',
});
const now = new Date('2026-09-22T12:00:00.000Z');
const input = {
	// A Wednesday one-off, 5 PM Pacific.
	date: '2026-09-23',
	registrationOpensAt: '17:00',
	registrationDurationMinutes: 45,
	capacity: 20,
	lotteryDelayMinutes: 10,
	autoCloseAfterMinutes: 240,
	questions: [],
};

afterEach(() => {
	resetDbStub();
	vi.clearAllMocks();
});

function insertedValues() {
	const values = db.insert.mock.results[0]!.value.values as ReturnType<typeof vi.fn>;

	return values.mock.calls[0]![0];
}

describe('addOneOffSession', () => {
	it('refuses a session that would open in the past', async () => {
		// Arrange
		vi.mocked(currentLocation).mockResolvedValue(location);

		// Act
		const result = await addOneOffSession({ ...input, date: '2026-09-21' }, now);

		// Assert
		expect(result).toMatchObject({ ok: false, status: 400 });
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it('adds the session at the location’s local time when none is unfinished', async () => {
		// Arrange
		vi.mocked(currentLocation).mockResolvedValue(location);
		const created = baseEvent({ id: 'one-off', status: 'scheduled' });

		queueResult([]); // no unfinished session
		queueResult([created]); // insert
		queueResult(undefined); // clear questions

		// Act
		const result = await addOneOffSession(input, now);

		// Assert
		expect(result).toEqual({ ok: true });
		expect(insertedValues()).toMatchObject({
			locationId: 'location-1',
			status: 'scheduled',
			registrationOpensAt: new Date('2026-09-24T00:00:00.000Z'),
			registrationClosesAt: new Date('2026-09-24T00:45:00.000Z'),
			lotteryDelayMinutes: 10,
			autoCloseAfterMinutes: 240,
		});
		expect(scheduleSessionTimers).toHaveBeenCalledWith(created, [
			'registration_close',
			'auto_close',
		]);
	});

	it('takes the place of the pattern’s unjoined Pending session', async () => {
		// Arrange
		vi.mocked(currentLocation).mockResolvedValue(location);

		queueResult([baseEvent({ status: 'scheduled', recurrencePatternId: 'pattern-1' })]);
		queueResult([{ visits: 0 }]);
		queueResult([{ id: 'event-1' }]); // Pending session deleted
		queueResult([baseEvent({ id: 'one-off', status: 'scheduled' })]);
		queueResult(undefined);

		// Act
		const result = await addOneOffSession(input, now);

		// Assert
		expect(result).toEqual({ ok: true });
	});

	it.each([
		['an active session', baseEvent({ status: 'registration_open' }), []],
		['a pending one-off session', baseEvent({ status: 'scheduled' }), []],
	])('refuses while there is %s', async (_case, unfinished) => {
		// Arrange
		vi.mocked(currentLocation).mockResolvedValue(location);
		queueResult([unfinished]);

		// Act
		const result = await addOneOffSession(input, now);

		// Assert
		expect(result).toMatchObject({ ok: false, status: 409 });
		expect(db.insert).not.toHaveBeenCalled();
	});

	it('refuses when a concurrent request created a session first', async () => {
		// Arrange
		vi.mocked(currentLocation).mockResolvedValue(location);
		vi.mocked(db.transaction).mockRejectedValueOnce(
			Object.assign(new Error('Failed query'), { cause: { code: '23505' } }),
		);

		// Act
		const result = await addOneOffSession(input, now);

		// Assert
		expect(result).toMatchObject({ ok: false, status: 409 });
	});
});

describe('updateSession', () => {
	it('refuses a session that has already opened', async () => {
		// Arrange
		vi.mocked(currentLocation).mockResolvedValue(location);
		queueResult([]); // the update matched no scheduled session

		// Act
		const result = await updateSession('event-1', input, now);

		// Assert
		expect(result).toMatchObject({ ok: false, status: 409 });
	});

	it('edits a Pending session and re-arms its timers', async () => {
		// Arrange
		vi.mocked(currentLocation).mockResolvedValue(location);
		const updated = baseEvent({ status: 'scheduled' });

		queueResult([updated]);
		queueResult(undefined); // clear questions

		// Act
		const result = await updateSession('event-1', input, now);

		// Assert
		expect(result).toEqual({ ok: true });
		expect(scheduleSessionTimers).toHaveBeenCalledWith(updated, [
			'registration_close',
			'auto_close',
		]);
	});
});

describe('deleteSession', () => {
	it('refuses a session the pattern created', async () => {
		// Arrange
		vi.mocked(currentLocation).mockResolvedValue(location);
		queueResult([baseEvent({ status: 'scheduled', recurrencePatternId: 'pattern-1' })]);

		// Act
		const result = await deleteSession('event-1', now);

		// Assert
		expect(result).toMatchObject({ ok: false, status: 409 });
		expect(db.delete).not.toHaveBeenCalled();
	});

	it('deletes a one-off session and lets the pattern create its next session', async () => {
		// Arrange
		vi.mocked(currentLocation).mockResolvedValue(location);
		const next = baseEvent({ id: 'next-event', status: 'scheduled' });

		queueResult([baseEvent({ status: 'scheduled' })]);
		queueResult([{ visits: 0 }]);
		queueResult([{ id: 'event-1' }]);
		vi.mocked(createNextSession).mockResolvedValueOnce(next);

		// Act
		const result = await deleteSession('event-1', now);

		// Assert
		expect(result).toEqual({ ok: true });
		expect(scheduleSessionTimers).toHaveBeenCalledWith(next, ['registration_close', 'auto_close']);
	});

	it('refuses a one-off session someone has joined', async () => {
		// Arrange
		vi.mocked(currentLocation).mockResolvedValue(location);
		queueResult([baseEvent({ status: 'scheduled' })]);
		queueResult([{ visits: 3 }]);

		// Act
		const result = await deleteSession('event-1', now);

		// Assert
		expect(result).toMatchObject({ ok: false, status: 409 });
	});
});
