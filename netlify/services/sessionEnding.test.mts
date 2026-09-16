import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../test/dbStub.mjs';
import { baseEvent } from '../test/marketEventFixture.mjs';

vi.mock('../../db/index.mjs', () => ({ db }));

import { createNextSession, endSession } from './sessionEnding.mjs';

afterEach(() => {
	resetDbStub();
});

const location = { id: 'location-1', name: 'The Bay Church', timeZone: 'America/Los_Angeles' };
const pattern = {
	id: 'pattern-1',
	locationId: 'location-1',
	// A Saturday.
	startsOn: '2026-09-19',
	registrationOpensAt: '10:30:00',
	registrationDurationMinutes: 60,
	capacity: 30,
	lotteryDelayMinutes: null,
	autoCloseAfterMinutes: 720,
	createdAt: new Date(),
	updatedAt: new Date(),
};
// Saturday 2026-09-26, 1 PM Pacific: after that day's session opened.
const saturdayAfternoon = new Date('2026-09-26T20:00:00.000Z');

function insertedValues(index: number) {
	const values = db.insert.mock.results[index]!.value.values as ReturnType<typeof vi.fn>;

	return values.mock.calls[0]![0];
}

describe('endSession', () => {
	it('ends a reset session without creating the next one', async () => {
		// Arrange
		const event = baseEvent({ status: 'registration_open' });

		queueResult([event]); // lock
		queueResult(undefined); // end
		queueResult([]); // visits resolved

		// Act
		const result = await endSession(db as never, event, 'reset', saturdayAfternoon);

		// Assert
		expect(result).toEqual({ ended: true, nextSession: null });
		expect(db.insert).not.toHaveBeenCalled();
	});

	it('creates the next session from the pattern when a session closes', async () => {
		// Arrange
		const event = baseEvent({ status: 'service_started', recurrencePatternId: 'pattern-1' });
		const next = baseEvent({ id: 'next-event', status: 'scheduled' });

		queueResult([event]); // lock
		queueResult(undefined); // end
		queueResult([]); // visits resolved
		queueResult([pattern]); // the location's pattern
		queueResult([location]); // its location
		queueResult([next]); // insert ... returning
		queueResult([]); // no pattern questions

		// Act
		const result = await endSession(db as never, event, 'close', saturdayAfternoon);

		// Assert
		expect(result).toEqual({ ended: true, nextSession: next });
		expect(insertedValues(0)).toMatchObject({
			locationId: 'location-1',
			recurrencePatternId: 'pattern-1',
			status: 'scheduled',
			capacity: 30,
			autoCloseAfterMinutes: 720,
			registrationOpensAt: new Date('2026-10-03T17:30:00.000Z'),
			registrationClosesAt: new Date('2026-10-03T18:30:00.000Z'),
		});
	});

	it('does nothing when the session moved on since it was read', async () => {
		// Arrange
		const event = baseEvent({ status: 'service_started' });

		queueResult([{ ...event, status: 'ended' }]); // lock

		// Act
		const result = await endSession(db as never, event, 'auto_close', saturdayAfternoon);

		// Assert
		expect(result).toEqual({ ended: false, nextSession: null });
		expect(db.update).not.toHaveBeenCalled();
	});
});

describe('createNextSession', () => {
	it('creates nothing without a pattern', async () => {
		// Arrange
		queueResult([]);

		// Act
		const created = await createNextSession(db as never, 'location-1', saturdayAfternoon);

		// Assert
		expect(created).toBeNull();
		expect(db.insert).not.toHaveBeenCalled();
	});

	it('treats an existing unfinished session as nothing to do', async () => {
		// Arrange
		queueResult([pattern]);
		queueResult([location]);
		queueResult([]); // ON CONFLICT DO NOTHING returned no row

		// Act
		const created = await createNextSession(db as never, 'location-1', saturdayAfternoon);

		// Assert
		expect(created).toBeNull();
		expect(db.insert).toHaveBeenCalledOnce();
	});

	it('copies the pattern’s questions onto the new session, in order', async () => {
		// Arrange
		queueResult([pattern]);
		queueResult([location]);
		queueResult([baseEvent({ id: 'next-event', status: 'scheduled' })]);
		queueResult([
			{
				id: 'q1',
				recurrencePatternId: 'pattern-1',
				prompt: 'Household?',
				type: 'text',
				required: true,
				position: 0,
			},
		]);
		queueResult(undefined); // insert registrationQuestions

		// Act
		await createNextSession(db as never, 'location-1', saturdayAfternoon);

		// Assert
		expect(insertedValues(1)).toEqual([
			{
				marketEventId: 'next-event',
				prompt: 'Household?',
				type: 'text',
				required: true,
				position: 0,
			},
		]);
	});
});
