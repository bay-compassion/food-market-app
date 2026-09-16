import { describe, expect, it } from 'vitest';

import { SessionTimeline, type SessionTiming } from './session-timeline';

function timeline(overrides: Partial<SessionTiming> = {}) {
	return new SessionTimeline({
		status: 'scheduled',
		registrationOpensAt: new Date('2026-07-18T16:00:00.000Z'),
		registrationClosesAt: new Date('2026-07-18T17:00:00.000Z'),
		...overrides,
	});
}

describe('SessionTimeline', () => {
	it.each([
		['2026-07-18T15:59:00.000Z', 'scheduled'],
		['2026-07-18T16:30:00.000Z', 'registration_open'],
		['2026-07-18T17:00:15.000Z', 'registration_closed'],
		['2026-07-18T17:01:00.000Z', 'lottery_pending'],
	] as const)('carries a scheduled session at %s to %s', (now, expected) => {
		// Act
		const status = timeline().statusAt(new Date(now));

		// Assert
		expect(status).toBe(expected);
	});

	it('moves a closed session to the lottery once its stored grace deadline passes', () => {
		// Arrange
		const closed = timeline({
			status: 'registration_closed',
			registrationGraceEndsAt: new Date('2026-07-18T17:05:00.000Z'),
		});

		// Act
		const during = closed.statusAt(new Date('2026-07-18T17:04:00.000Z'));
		const after = closed.statusAt(new Date('2026-07-18T17:05:00.000Z'));

		// Assert
		expect(during).toBe('registration_closed');
		expect(after).toBe('lottery_pending');
	});

	it.each([
		['2026-07-18T15:59:00.000Z', false],
		['2026-07-18T16:30:00.000Z', true],
		['2026-07-18T17:00:15.000Z', true],
		['2026-07-18T17:01:00.000Z', false],
	] as const)('at %s accepts self-registration: %s', (now, expected) => {
		// Act
		const accepts = timeline().acceptsSelfRegistration(new Date(now));

		// Assert
		expect(accepts).toBe(expected);
	});

	it('preserves the window’s length when opening early', () => {
		// Act
		const opened = timeline().openingWindow(new Date('2026-07-18T15:00:00.000Z'));

		// Assert
		expect(opened.registrationOpensAt.toISOString()).toBe('2026-07-18T15:00:00.000Z');
		expect(opened.registrationClosesAt.toISOString()).toBe('2026-07-18T16:00:00.000Z');
	});

	it('shifts both times when postponed', () => {
		// Act
		const postponed = timeline().postponedWindow(30);

		// Assert
		expect(postponed.registrationOpensAt.toISOString()).toBe('2026-07-18T16:30:00.000Z');
		expect(postponed.registrationClosesAt.toISOString()).toBe('2026-07-18T17:30:00.000Z');
	});

	it('draws the lottery by hand when no delay is set', () => {
		// Act
		const drawsAt = timeline().lotteryDrawsAt;

		// Assert
		expect(drawsAt).toBeNull();
	});

	it('draws the lottery the configured delay after the grace deadline', () => {
		// Act
		const drawsAt = timeline({ lotteryDelayMinutes: 15 }).lotteryDrawsAt;

		// Assert
		expect(drawsAt?.toISOString()).toBe('2026-07-18T17:15:30.000Z');
	});

	it('counts auto-close from the actual opening, so Start Now moves it', () => {
		// Arrange: started a day early.
		const startedEarly = timeline({
			status: 'registration_open',
			autoCloseAfterMinutes: 720,
			...timeline().openingWindow(new Date('2026-07-17T16:00:00.000Z')),
		});

		// Act
		const closesAt = startedEarly.autoClosesAt;

		// Assert
		expect(closesAt?.toISOString()).toBe('2026-07-18T04:00:00.000Z');
	});

	it('is overdue for auto-close only while unfinished and past its time', () => {
		// Arrange
		const now = new Date('2026-07-19T05:00:00.000Z');

		// Act
		const open = timeline({ status: 'service_started', autoCloseAfterMinutes: 720 });
		const ended = timeline({ status: 'ended', autoCloseAfterMinutes: 720 });
		const never = timeline({ status: 'service_started' });

		// Assert
		expect(open.isOverdueForAutoClose(now)).toBe(true);
		expect(open.isOverdueForAutoClose(new Date('2026-07-19T03:59:00.000Z'))).toBe(false);
		expect(ended.isOverdueForAutoClose(now)).toBe(false);
		expect(never.isOverdueForAutoClose(now)).toBe(false);
	});

	it('names the time each timer is due', () => {
		// Arrange
		const session = timeline({ lotteryDelayMinutes: 0, autoCloseAfterMinutes: 60 });

		// Act
		const times = (['registration_close', 'lottery_draw', 'auto_close'] as const).map((kind) =>
			session.timerAt(kind)?.toISOString(),
		);

		// Assert
		expect(times).toEqual([
			'2026-07-18T17:00:00.000Z',
			'2026-07-18T17:00:30.000Z',
			'2026-07-18T17:00:00.000Z',
		]);
	});
});
