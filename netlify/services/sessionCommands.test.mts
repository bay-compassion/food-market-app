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

import { notificationsEnabled } from './pushNotifications.mjs';
import {
	closeRegistration,
	closeSession,
	openRegistration,
	postponeLottery,
	postponeRegistration,
	reopenRegistration,
	resetSession,
	updateRegistration,
} from './sessionCommands.mjs';
import { scheduleSessionTimers } from './sessionTimers.mjs';

afterEach(() => {
	resetDbStub();
	vi.mocked(notificationsEnabled).mockReturnValue(true);
});

describe('remaining session actions: one legal and one illegal transition each', () => {
	it('resetSession: an open session can reset to ended; an already-ended session cannot', async () => {
		queueResult([baseEvent({ status: 'registration_open' })]); // endSession locks the session
		queueResult(undefined); // ending it
		queueResult([]); // nobody left in line
		await expect(resetSession(baseEvent({ status: 'registration_open' }))).resolves.toEqual({
			ok: true,
		});

		await expect(resetSession(baseEvent({ status: 'ended' }))).resolves.toMatchObject({
			ok: false,
			status: 409,
		});
	});

	it('updateRegistration: valid override while open succeeds; wrong status is rejected', async () => {
		const event = baseEvent({ status: 'registration_open' });
		const override = {
			registrationClosesAt: new Date(event.registrationClosesAt.valueOf() + 60_000).toISOString(),
			capacity: 15,
		};

		queueResult([{ id: 'event-1' }]);
		await expect(updateRegistration(event, override)).resolves.toEqual({ ok: true });

		await expect(
			updateRegistration(baseEvent({ status: 'scheduled' }), override),
		).resolves.toMatchObject({ ok: false, status: 400 });
	});

	it('postponeRegistration: a scheduled session can be postponed; an open one cannot', async () => {
		queueResult([{ id: 'event-1' }]);
		await expect(
			postponeRegistration(baseEvent({ status: 'scheduled' }), { minutes: 30 }),
		).resolves.toEqual({ ok: true });

		await expect(
			postponeRegistration(baseEvent({ status: 'registration_open' }), { minutes: 30 }),
		).resolves.toMatchObject({ ok: false, status: 409 });
	});

	it('openRegistration: a scheduled session can open registration; an ended session cannot', async () => {
		queueResult([{ id: 'event-1' }]);
		await expect(openRegistration(baseEvent({ status: 'scheduled' }))).resolves.toEqual({
			ok: true,
		});

		await expect(openRegistration(baseEvent({ status: 'ended' }))).resolves.toMatchObject({
			ok: false,
			status: 409,
		});
	});

	it('reopenRegistration: a closed session can reopen; a scheduled one cannot', async () => {
		queueResult([{ id: 'event-1' }]);
		await expect(reopenRegistration(baseEvent({ status: 'registration_closed' }))).resolves.toEqual(
			{ ok: true },
		);

		await expect(reopenRegistration(baseEvent({ status: 'scheduled' }))).resolves.toMatchObject({
			ok: false,
			status: 409,
		});
	});

	it('closeRegistration: an open session can close registration; a scheduled one cannot', async () => {
		queueResult([{ id: 'event-1' }]); // tx.update ... returning
		queueResult([]); // no registered visits to notify
		await expect(closeRegistration(baseEvent({ status: 'registration_open' }))).resolves.toEqual({
			ok: true,
		});

		await expect(closeRegistration(baseEvent({ status: 'scheduled' }))).resolves.toMatchObject({
			ok: false,
			status: 409,
		});
	});

	it('closeSession: a started session can close; a scheduled session cannot', async () => {
		queueResult([baseEvent({ status: 'service_started' })]); // endSession locks the session
		queueResult(undefined); // ending it
		queueResult([]); // resolveOutstandingVisits — nobody left in line
		queueResult([]); // no recurrence pattern, so no next session
		await expect(closeSession(baseEvent({ status: 'service_started' }))).resolves.toEqual({
			ok: true,
		});

		await expect(closeSession(baseEvent({ status: 'scheduled' }))).resolves.toMatchObject({
			ok: false,
			status: 409,
		});
	});

	it('closeSession: cancels guests still in line so nobody is stranded or marked a no-show', async () => {
		queueResult([baseEvent({ status: 'service_started' })]);
		queueResult(undefined);
		queueResult([{ id: 'visit-1' }, { id: 'visit-2' }]);
		queueResult([]); // no recurrence pattern

		await expect(closeSession(baseEvent({ status: 'service_started' }))).resolves.toEqual({
			ok: true,
		});

		const statuses = db.update.mock.results
			.map(({ value }) => value as { set: ReturnType<typeof vi.fn> })
			.flatMap(({ set }) => set.mock.calls.map(([changes]) => changes?.status));

		expect(statuses).toEqual(['ended', 'cancelled']);
	});

	it('closeSession: refuses a session another request already ended', async () => {
		queueResult([baseEvent({ status: 'ended' })]); // the lock sees it already ended

		await expect(closeSession(baseEvent({ status: 'service_started' }))).resolves.toMatchObject({
			ok: false,
			status: 409,
		});
		expect(db.update).not.toHaveBeenCalled();
	});
});

describe('session timers and the scheduled lottery', () => {
	it('closeSession arms the timers of the session the pattern created next', async () => {
		// Arrange
		const next = baseEvent({ id: 'next-event', status: 'scheduled' });
		const pattern = {
			id: 'pattern-1',
			locationId: 'location-1',
			startsOn: '2026-09-19',
			registrationOpensAt: '10:30:00',
			registrationDurationMinutes: 60,
			capacity: 30,
			lotteryDelayMinutes: null,
			autoCloseAfterMinutes: 720,
		};

		queueResult([baseEvent({ status: 'service_started' })]); // lock
		queueResult(undefined); // end
		queueResult([]); // nobody in line
		queueResult([pattern]);
		queueResult([{ id: 'location-1', name: 'The Bay Church', timeZone: 'America/Los_Angeles' }]);
		queueResult([next]); // insert ... returning
		queueResult([]); // no pattern questions

		// Act
		const result = await closeSession(baseEvent({ status: 'service_started' }));

		// Assert
		expect(result).toEqual({ ok: true });
		expect(scheduleSessionTimers).toHaveBeenCalledWith(next, ['registration_close', 'auto_close']);
	});

	it('closeRegistration arms the lottery draw with the grace deadline it just set', async () => {
		// Arrange
		const closed = baseEvent({ status: 'registration_closed', lotteryDelayMinutes: 10 });

		queueResult([closed]); // update ... returning
		queueResult([]); // no registered visits to notify

		// Act
		await closeRegistration(baseEvent({ status: 'registration_open', lotteryDelayMinutes: 10 }));

		// Assert
		expect(scheduleSessionTimers).toHaveBeenCalledWith(closed, ['lottery_draw']);
	});

	it('updateRegistration refuses to close registration after the session auto-closes', async () => {
		// Arrange
		const event = baseEvent({ status: 'registration_open', autoCloseAfterMinutes: 180 });
		const autoClosesAt = event.registrationOpensAt.valueOf() + 180 * 60_000;

		// Act
		const result = await updateRegistration(event, {
			registrationClosesAt: new Date(autoClosesAt).toISOString(),
			capacity: 10,
		});

		// Assert
		expect(result).toMatchObject({ ok: false, status: 400 });
		expect(db.update).not.toHaveBeenCalled();
	});

	it('postponeLottery adds the minutes to the delay and re-arms the draw', async () => {
		// Arrange
		const event = baseEvent({ status: 'lottery_pending', lotteryDelayMinutes: 15 });
		const updated = { ...event, lotteryDelayMinutes: 20 };

		queueResult([updated]);

		// Act
		const result = await postponeLottery(event, { minutes: 5 });

		// Assert
		expect(result).toEqual({ ok: true });
		const set = db.update.mock.results[0]!.value.set as ReturnType<typeof vi.fn>;
		expect(set).toHaveBeenCalledWith({ lotteryDelayMinutes: 20 });
		expect(scheduleSessionTimers).toHaveBeenCalledWith(updated, ['lottery_draw']);
	});

	it.each([
		['a manual draw', baseEvent({ status: 'lottery_pending' }), { minutes: 5 }],
		[
			'more than ten minutes',
			baseEvent({ status: 'lottery_pending', lotteryDelayMinutes: 15 }),
			{ minutes: 11 },
		],
		[
			'a draw that already ran',
			baseEvent({ status: 'service_started', lotteryDelayMinutes: 15 }),
			{ minutes: 5 },
		],
	])('postponeLottery refuses %s', async (_case, event, body) => {
		// Act
		const result = await postponeLottery(event, body);

		// Assert
		expect(result).toMatchObject({ ok: false, status: 409 });
		expect(db.update).not.toHaveBeenCalled();
	});
});
