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
import { createNextSessionNow, deletePattern, savePattern } from './schedulePattern.mjs';
import { createNextSession } from './sessionEnding.mjs';
import { scheduleSessionTimers } from './sessionTimers.mjs';

const location = new MarketLocation({
	id: 'location-1',
	name: 'The Bay Church',
	timeZone: 'America/Los_Angeles',
});
const input = {
	startsOn: '2026-09-19',
	registrationOpensAt: '10:30',
	registrationDurationMinutes: 60,
	capacity: 30,
	lotteryDelayMinutes: null,
	autoCloseAfterMinutes: 720,
	questions: [{ prompt: 'Household size?', type: 'text' as const, required: true }],
};
const pattern = { id: 'pattern-1', locationId: 'location-1', ...input };

afterEach(() => {
	resetDbStub();
	vi.clearAllMocks();
});

function arrangeLocation() {
	vi.mocked(currentLocation).mockResolvedValue(location);
}

describe('savePattern', () => {
	it('creates the pattern and, with no session at all, its first session', async () => {
		// Arrange
		arrangeLocation();
		const next = baseEvent({ id: 'next-event', status: 'scheduled' });

		queueResult([]); // no pattern yet
		queueResult([pattern]); // insert pattern
		queueResult(undefined); // clear questions
		queueResult(undefined); // insert questions
		queueResult([]); // no unfinished session
		vi.mocked(createNextSession).mockResolvedValueOnce(next);

		// Act
		const result = await savePattern(input);

		// Assert
		expect(result).toEqual({ ok: true });
		expect(createNextSession).toHaveBeenCalledOnce();
		expect(scheduleSessionTimers).toHaveBeenCalledWith(next, ['registration_close', 'auto_close']);
	});

	it('regenerates a Pending session the pattern created, when nobody has joined it', async () => {
		// Arrange
		arrangeLocation();
		const pending = baseEvent({ status: 'scheduled', recurrencePatternId: 'pattern-1' });

		queueResult([pattern]); // existing pattern
		queueResult([pattern]); // update pattern
		queueResult(undefined); // clear questions
		queueResult(undefined); // insert questions
		queueResult([pending]); // the unfinished session
		queueResult([{ visits: 0 }]); // nobody joined
		queueResult([{ id: pending.id }]); // deleted
		vi.mocked(createNextSession).mockResolvedValueOnce(null);

		// Act
		await savePattern(input);

		// Assert
		expect(db.delete).toHaveBeenCalledTimes(2); // old questions, then the Pending session
		expect(createNextSession).toHaveBeenCalledOnce();
	});

	it('leaves an active session alone; the new settings apply from the next session', async () => {
		// Arrange
		arrangeLocation();

		queueResult([pattern]);
		queueResult([pattern]);
		queueResult(undefined);
		queueResult(undefined);
		queueResult([baseEvent({ status: 'service_started', recurrencePatternId: 'pattern-1' })]);

		// Act
		await savePattern(input);

		// Assert
		expect(createNextSession).not.toHaveBeenCalled();
		expect(scheduleSessionTimers).not.toHaveBeenCalled();
	});
});

describe('deletePattern', () => {
	it('answers 404 when there is no pattern', async () => {
		// Arrange
		arrangeLocation();
		queueResult([]);

		// Act
		const result = await deletePattern();

		// Assert
		expect(result).toMatchObject({ ok: false, status: 404 });
	});

	it('deletes the pattern and its unjoined Pending session', async () => {
		// Arrange
		arrangeLocation();
		queueResult([pattern]);
		queueResult([baseEvent({ status: 'scheduled', recurrencePatternId: 'pattern-1' })]);
		queueResult([{ visits: 0 }]);
		queueResult([{ id: 'event-1' }]); // Pending session deleted
		queueResult(undefined); // pattern deleted

		// Act
		const result = await deletePattern();

		// Assert
		expect(result).toEqual({ ok: true });
		expect(db.delete).toHaveBeenCalledTimes(2);
	});
});

describe('createNextSessionNow', () => {
	it('refuses while a session is unfinished', async () => {
		// Arrange
		arrangeLocation();
		queueResult([baseEvent({ status: 'scheduled' })]);

		// Act
		const result = await createNextSessionNow();

		// Assert
		expect(result).toMatchObject({ ok: false, status: 409 });
		expect(createNextSession).not.toHaveBeenCalled();
	});

	it('refuses without a pattern', async () => {
		// Arrange
		arrangeLocation();
		queueResult([]); // no unfinished session
		queueResult([]); // no pattern

		// Act
		const result = await createNextSessionNow();

		// Assert
		expect(result).toMatchObject({ ok: false, status: 409 });
	});

	it('creates the next session after a reset and arms its timers', async () => {
		// Arrange
		arrangeLocation();
		const next = baseEvent({ id: 'next-event', status: 'scheduled' });

		queueResult([]);
		queueResult([pattern]);
		vi.mocked(createNextSession).mockResolvedValueOnce(next);

		// Act
		const result = await createNextSessionNow();

		// Assert
		expect(result).toEqual({ ok: true });
		expect(scheduleSessionTimers).toHaveBeenCalledWith(next, ['registration_close', 'auto_close']);
	});
});
