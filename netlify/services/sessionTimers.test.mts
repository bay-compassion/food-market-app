import { afterEach, describe, expect, it, vi } from 'vitest';

const send = vi.fn();

vi.mock('@netlify/async-workloads', () => ({
	AsyncWorkloadsClient: vi.fn(function AsyncWorkloadsClient() {
		return { send };
	}),
}));

import { baseEvent } from '../test/marketEventFixture.mjs';
import { maxTimerDelayMs, scheduleSessionTimers, sendSessionTimer } from './sessionTimers.mjs';

afterEach(() => {
	send.mockReset();
});

describe('session timers', () => {
	it('delays a near timer until it is due', async () => {
		// Arrange
		send.mockResolvedValueOnce({ sendStatus: 'succeeded', eventId: 'e1' });
		const now = new Date('2026-09-26T12:00:00.000Z');
		const dueAt = new Date('2026-09-26T18:00:00.000Z');

		// Act
		await sendSessionTimer('event-1', 'registration_close', dueAt, now);

		// Assert
		expect(send).toHaveBeenCalledWith('market.session-timer', {
			data: {
				marketEventId: 'event-1',
				timer: 'registration_close',
				expectedAt: dueAt.toISOString(),
			},
			delayUntil: dueAt.valueOf(),
		});
	});

	it('sends a distant timer in a hop no longer than the maximum delay', async () => {
		// Arrange
		send.mockResolvedValueOnce({ sendStatus: 'succeeded', eventId: 'e1' });
		const now = new Date('2026-09-20T12:00:00.000Z');
		const dueAt = new Date('2026-10-01T12:00:00.000Z');

		// Act
		await sendSessionTimer('event-1', 'auto_close', dueAt, now);

		// Assert
		expect(send.mock.calls[0]![1].delayUntil).toBe(now.valueOf() + maxTimerDelayMs);
	});

	it('fails loudly when a timer cannot be queued', async () => {
		// Arrange
		send.mockResolvedValueOnce({ sendStatus: 'failed', eventId: '' });

		// Act
		const sending = sendSessionTimer('event-1', 'lottery_draw', new Date(), new Date());

		// Assert
		await expect(sending).rejects.toThrow('lottery_draw');
	});

	it('skips timers the session has no time for', async () => {
		// Arrange: a manual draw and no auto-close.
		send.mockResolvedValue({ sendStatus: 'succeeded', eventId: 'e1' });

		// Act
		await scheduleSessionTimers(baseEvent({ status: 'scheduled' }), [
			'registration_close',
			'lottery_draw',
			'auto_close',
		]);

		// Assert
		expect(send).toHaveBeenCalledOnce();
		expect(send.mock.calls[0]![1].data.timer).toBe('registration_close');
	});
});
