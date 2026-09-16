import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../test/dbStub.mjs';
import { baseEvent } from '../test/marketEventFixture.mjs';

vi.mock('../../db/index.mjs', () => ({ db }));
vi.mock('./pushNotifications.mjs', () => ({ notificationsEnabled: vi.fn(() => true) }));
vi.mock('./notificationDispatch.mjs', () => ({ requestNotificationDispatch: vi.fn() }));
vi.mock('./marketLifecycleEvents.mjs', () => ({ scheduleRegistrationClose: vi.fn() }));

import { getCurrentEvent } from './marketSession.mjs';
import { notificationsEnabled } from './pushNotifications.mjs';

afterEach(() => {
	resetDbStub();
	vi.mocked(notificationsEnabled).mockReturnValue(true);
});

describe('getCurrentEvent', () => {
	it('returns the event unchanged when its automatic status already matches', async () => {
		queueResult([baseEvent({ status: 'draft' })]);

		const event = await getCurrentEvent();

		expect(event?.status).toBe('draft');
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
