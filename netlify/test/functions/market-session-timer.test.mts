import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';
import { baseEvent } from '../marketEventFixture.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));
vi.mock('../../services/marketSession.mjs', () => ({ getCurrentEvent: vi.fn() }));
vi.mock('../../services/lottery.mjs', () => ({ runLottery: vi.fn() }));
vi.mock('../../services/notificationDispatch.mjs', () => ({
	requestNotificationDispatch: vi.fn(),
}));
vi.mock('../../services/sessionEnding.mjs', () => ({ endSession: vi.fn() }));
vi.mock('../../services/sessionTimers.mjs', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../services/sessionTimers.mjs')>()),
	scheduleSessionTimers: vi.fn(),
	sendSessionTimer: vi.fn(),
}));

import { runSessionTimer } from '../../functions/market-session-timer.mjs';
import { runLottery } from '../../services/lottery.mjs';
import { getCurrentEvent } from '../../services/marketSession.mjs';
import { requestNotificationDispatch } from '../../services/notificationDispatch.mjs';
import { endSession } from '../../services/sessionEnding.mjs';
import { scheduleSessionTimers, sendSessionTimer } from '../../services/sessionTimers.mjs';

afterEach(() => {
	resetDbStub();
	vi.clearAllMocks();
});

const opensAt = new Date('2026-09-26T17:30:00.000Z');
const closesAt = new Date('2026-09-26T18:30:00.000Z');

function session(overrides = {}) {
	return baseEvent({ registrationOpensAt: opensAt, registrationClosesAt: closesAt, ...overrides });
}

function timerEvent(timer: string, expectedAt: Date) {
	return {
		eventName: 'market.session-timer',
		eventData: { marketEventId: 'event-1', timer, expectedAt: expectedAt.toISOString() },
	} as never;
}

describe('market session timer workload', () => {
	it('does nothing for a timer whose time has since moved', async () => {
		// Arrange: registration was extended after this close timer was sent.
		queueResult([session({ registrationClosesAt: new Date('2026-09-26T19:00:00.000Z') })]);

		// Act
		await runSessionTimer(timerEvent('registration_close', closesAt), new Date(closesAt));

		// Assert
		expect(getCurrentEvent).not.toHaveBeenCalled();
		expect(sendSessionTimer).not.toHaveBeenCalled();
	});

	it('does nothing once the session has ended', async () => {
		// Arrange
		queueResult([session({ status: 'ended' })]);

		// Act
		await runSessionTimer(timerEvent('registration_close', closesAt), new Date(closesAt));

		// Assert
		expect(getCurrentEvent).not.toHaveBeenCalled();
	});

	it('sends itself again when it wakes before its time', async () => {
		// Arrange: auto-close is a week and a half away; this hop arrived early.
		const autoClosing = session({ status: 'scheduled', autoCloseAfterMinutes: 720 });
		const dueAt = new Date(opensAt.valueOf() + 720 * 60_000);
		const now = new Date('2026-09-20T12:00:00.000Z');

		queueResult([autoClosing]);

		// Act
		await runSessionTimer(timerEvent('auto_close', dueAt), now);

		// Assert
		expect(sendSessionTimer).toHaveBeenCalledWith('event-1', 'auto_close', dueAt, now);
		expect(endSession).not.toHaveBeenCalled();
	});

	it('closes registration by reading the current session', async () => {
		// Arrange
		queueResult([session()]);

		// Act
		await runSessionTimer(timerEvent('registration_close', closesAt), new Date(closesAt));

		// Assert
		expect(getCurrentEvent).toHaveBeenCalledOnce();
	});

	it('accepts a registration close queued under the old event name', async () => {
		// Arrange
		queueResult([session()]);

		// Act
		await runSessionTimer(
			{
				eventName: 'market.registration-close',
				eventData: {
					marketEventId: 'event-1',
					expectedRegistrationClosesAt: closesAt.toISOString(),
				},
			} as never,
			new Date(closesAt),
		);

		// Assert
		expect(getCurrentEvent).toHaveBeenCalledOnce();
	});

	it('draws the lottery and dispatches its notifications once pending', async () => {
		// Arrange
		const pending = session({ status: 'lottery_pending', lotteryDelayMinutes: 5 });
		const dueAt = new Date(closesAt.valueOf() + 30_000 + 5 * 60_000);

		queueResult([pending]);
		vi.mocked(getCurrentEvent).mockResolvedValueOnce(pending);
		vi.mocked(runLottery).mockResolvedValueOnce({ ok: true });

		// Act
		await runSessionTimer(timerEvent('lottery_draw', dueAt), dueAt);

		// Assert
		expect(runLottery).toHaveBeenCalledWith(pending, undefined, dueAt.toISOString());
		expect(requestNotificationDispatch).toHaveBeenCalledWith({
			marketEventId: 'event-1',
			types: ['lottery_selected', 'lottery_not_selected'],
		});
	});

	it('does not draw when staff already ran the lottery', async () => {
		// Arrange
		const pending = session({ status: 'lottery_pending', lotteryDelayMinutes: 5 });
		const dueAt = new Date(closesAt.valueOf() + 30_000 + 5 * 60_000);

		queueResult([pending]);
		vi.mocked(getCurrentEvent).mockResolvedValueOnce({ ...pending, status: 'service_started' });

		// Act
		await runSessionTimer(timerEvent('lottery_draw', dueAt), dueAt);

		// Assert
		expect(runLottery).not.toHaveBeenCalled();
	});

	it('auto-closes the session and arms the next session’s timers', async () => {
		// Arrange
		const open = session({ status: 'service_started', autoCloseAfterMinutes: 720 });
		const dueAt = new Date(opensAt.valueOf() + 720 * 60_000);
		const next = baseEvent({ id: 'next-event', status: 'scheduled' });

		queueResult([open]);
		vi.mocked(endSession).mockResolvedValueOnce({ ended: true, nextSession: next });

		// Act
		await runSessionTimer(timerEvent('auto_close', dueAt), dueAt);

		// Assert
		expect(endSession).toHaveBeenCalledWith(db, open, 'auto_close', dueAt);
		expect(scheduleSessionTimers).toHaveBeenCalledWith(next, ['registration_close', 'auto_close']);
	});
});
