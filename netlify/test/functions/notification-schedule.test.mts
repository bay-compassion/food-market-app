import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.js', () => ({ db }));
vi.mock('../../services/pushNotifications.mjs', () => ({
	deliverPendingNotifications: vi.fn(),
	notificationsEnabled: vi.fn(),
}));

import handler from '../../functions/notification-schedule.mjs';
import {
	deliverPendingNotifications,
	notificationsEnabled,
} from '../../services/pushNotifications.mjs';

afterEach(() => {
	resetDbStub();
	vi.mocked(notificationsEnabled).mockReset();
	vi.mocked(deliverPendingNotifications).mockReset();
});

describe('notification-schedule handler', () => {
	it('does nothing when notifications are disabled', async () => {
		vi.mocked(notificationsEnabled).mockReturnValueOnce(false);

		await handler();

		expect(db.update).not.toHaveBeenCalled();
		expect(deliverPendingNotifications).not.toHaveBeenCalled();
	});

	it(
		'takes no Request and performs no auth check by design — it relies entirely on being ' +
			'invoked as a Netlify Scheduled Function, not on any application-level gate',
		async () => {
			vi.mocked(notificationsEnabled).mockReturnValueOnce(true);
			queueResult(undefined); // bulk open scheduled sessions
			queueResult([]); // due events
			vi.mocked(deliverPendingNotifications).mockResolvedValueOnce({
				sent: 0,
				failed: 0,
				skipped: 0,
			});

			await expect((handler as () => Promise<void>)()).resolves.toBeUndefined();
		},
	);

	it('opens scheduled sessions whose registration window has arrived', async () => {
		vi.mocked(notificationsEnabled).mockReturnValueOnce(true);
		queueResult(undefined);
		queueResult([]);
		vi.mocked(deliverPendingNotifications).mockResolvedValueOnce({
			sent: 0,
			failed: 0,
			skipped: 0,
		});

		await handler();

		expect(db.update).toHaveBeenCalledTimes(1);
		expect(deliverPendingNotifications).toHaveBeenCalledWith({ limit: 250 });
	});

	it('closes a due event and enqueues registration_closed notifications for registered visits', async () => {
		vi.mocked(notificationsEnabled).mockReturnValueOnce(true);
		queueResult(undefined); // bulk open
		queueResult([{ id: 'event-1' }]); // due events
		queueResult([{ id: 'event-1' }]); // tx.update ... returning
		queueResult([{ visitId: 'visit-1' }, { visitId: 'visit-2' }]); // tx.select registrations
		queueResult(undefined); // tx.insert notificationDeliveries
		vi.mocked(deliverPendingNotifications).mockResolvedValueOnce({
			sent: 2,
			failed: 0,
			skipped: 0,
		});

		await handler();

		expect(db.transaction).toHaveBeenCalledTimes(1);
	});

	it('does not enqueue anything when another process already closed the event first', async () => {
		vi.mocked(notificationsEnabled).mockReturnValueOnce(true);
		queueResult(undefined);
		queueResult([{ id: 'event-1' }]);
		queueResult([]); // tx.update ... returning — no row matched, lost the race

		await handler();

		// Only the failed update was queued; if the handler tried another query it would throw
		// "no queued result", so reaching this point confirms it stopped after the no-op update.
		expect(deliverPendingNotifications).toHaveBeenCalledTimes(1);
	});

	it('skips the notification insert when the closed event had no registered visits', async () => {
		vi.mocked(notificationsEnabled).mockReturnValueOnce(true);
		queueResult(undefined);
		queueResult([{ id: 'event-1' }]);
		queueResult([{ id: 'event-1' }]);
		queueResult([]); // no registered visits
		vi.mocked(deliverPendingNotifications).mockResolvedValueOnce({
			sent: 0,
			failed: 0,
			skipped: 0,
		});

		await expect(handler()).resolves.toBeUndefined();
	});
});
