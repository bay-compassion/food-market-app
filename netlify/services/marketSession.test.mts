import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../test/dbStub.mjs';
import { baseEvent } from '../test/marketEventFixture.mjs';

vi.mock('../../db/index.mjs', () => ({ db }));
vi.mock('./pushNotifications.mjs', () => ({ notificationsEnabled: vi.fn(() => true) }));
vi.mock('./notificationDispatch.mjs', () => ({ requestNotificationDispatch: vi.fn() }));
vi.mock('./sessionTimers.mjs', () => ({
	scheduleSessionTimers: vi.fn(),
	scheduleSessionTimersQuietly: vi.fn(),
	upcomingSessionTimers: ['registration_close', 'auto_close'],
}));

import { getCurrentEvent } from './marketSession.mjs';
import { notificationsEnabled } from './pushNotifications.mjs';
import { scheduleSessionTimersQuietly } from './sessionTimers.mjs';

afterEach(() => {
	resetDbStub();
	vi.mocked(notificationsEnabled).mockReturnValue(true);
});

describe('getCurrentEvent', () => {
	it('returns the event unchanged when its automatic status already matches', async () => {
		queueResult([baseEvent()]);

		const event = await getCurrentEvent();

		expect(event?.status).toBe('registration_open');
		expect(db.transaction).not.toHaveBeenCalled();
	});

	it(
		'transitions status as a side effect of a plain read — a scheduled session whose ' +
			'opening time has arrived flips to registration_open even on an unauthenticated GET',
		async () => {
			queueResult([
				baseEvent({
					status: 'scheduled',
					registrationOpensAt: new Date(Date.now() - 1000),
					registrationClosesAt: new Date(Date.now() + 3_600_000),
				}),
			]);
			queueResult([baseEvent({ status: 'registration_open' })]); // tx.update ... returning

			const event = await getCurrentEvent();

			expect(db.transaction).toHaveBeenCalledTimes(1);
			expect(event?.status).toBe('registration_open');
		},
	);

	it('enqueues registration_closed notifications when the automatic transition closes registration', async () => {
		queueResult([
			baseEvent({
				status: 'registration_open',
				registrationOpensAt: new Date(Date.now() - 3_600_000),
				registrationClosesAt: new Date(Date.now() - 1000),
			}),
		]);
		queueResult([baseEvent({ status: 'registration_closed' })]); // tx.update ... returning
		queueResult([{ visitId: 'visit-1' }]); // registered visits
		queueResult(undefined); // insert notificationDeliveries

		const event = await getCurrentEvent();

		expect(event?.status).toBe('registration_closed');
		expect(db.insert).toHaveBeenCalledTimes(1);
	});

	it('freezes registration as lottery_pending when the grace deadline passes', async () => {
		const closed = baseEvent({
			status: 'registration_closed',
			registrationGraceEndsAt: new Date(Date.now() - 1000),
		});

		queueResult([closed]);
		queueResult([{ ...closed, status: 'lottery_pending' }]);

		const event = await getCurrentEvent();

		expect(event?.status).toBe('lottery_pending');
	});
});

describe('getCurrentEvent auto-close', () => {
	it('ends an overdue session on read and returns the session created in its place', async () => {
		// Arrange
		const overdue = baseEvent({
			status: 'service_started',
			registrationOpensAt: new Date(Date.now() - 13 * 3_600_000),
			registrationClosesAt: new Date(Date.now() - 12 * 3_600_000),
			autoCloseAfterMinutes: 720,
			recurrencePatternId: 'pattern-1',
		});
		const next = baseEvent({
			id: 'next-event',
			status: 'scheduled',
			registrationOpensAt: new Date(Date.now() + 6 * 24 * 3_600_000),
			registrationClosesAt: new Date(Date.now() + 6 * 24 * 3_600_000 + 3_600_000),
		});

		queueResult([overdue]); // latest active event
		queueResult([overdue]); // endSession lock
		queueResult(undefined); // end
		queueResult([]); // nobody in line
		queueResult([
			{
				id: 'pattern-1',
				locationId: 'location-1',
				startsOn: '2026-09-19',
				registrationOpensAt: '10:30:00',
				registrationDurationMinutes: 60,
				capacity: 30,
				lotteryDelayMinutes: null,
				autoCloseAfterMinutes: 720,
			},
		]);
		queueResult([{ id: 'location-1', name: 'The Bay Church', timeZone: 'America/Los_Angeles' }]);
		queueResult([next]); // insert ... returning
		queueResult([]); // no pattern questions

		// Act
		const event = await getCurrentEvent();

		// Assert
		expect(event?.id).toBe('next-event');
		expect(scheduleSessionTimersQuietly).toHaveBeenCalledWith(next, [
			'registration_close',
			'auto_close',
		]);
	});

	it('returns no session when an overdue one-off session ends and there is no pattern', async () => {
		// Arrange
		const overdue = baseEvent({
			status: 'registration_open',
			registrationOpensAt: new Date(Date.now() - 2 * 3_600_000),
			registrationClosesAt: new Date(Date.now() + 3_600_000),
			autoCloseAfterMinutes: 60,
		});

		queueResult([overdue]); // latest active event
		queueResult([overdue]); // endSession lock
		queueResult(undefined); // end
		queueResult([]); // nobody in line
		queueResult([]); // no pattern
		queueResult([]); // nothing else unfinished

		// Act
		const event = await getCurrentEvent();

		// Assert
		expect(event).toBeNull();
	});
});
