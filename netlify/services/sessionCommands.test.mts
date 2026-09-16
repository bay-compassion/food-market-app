import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../test/dbStub.mjs';
import { baseEvent } from '../test/marketEventFixture.mjs';

vi.mock('../../db/index.mjs', () => ({ db }));
vi.mock('./pushNotifications.mjs', () => ({ notificationsEnabled: vi.fn(() => true) }));
vi.mock('./notificationDispatch.mjs', () => ({ requestNotificationDispatch: vi.fn() }));
vi.mock('./marketLifecycleEvents.mjs', () => ({ scheduleRegistrationClose: vi.fn() }));

import { notificationsEnabled } from './pushNotifications.mjs';
import {
	closeRegistration,
	closeSession,
	openRegistration,
	postponeRegistration,
	reopenRegistration,
	resetSession,
	scheduleRegistration,
	updateRegistration,
} from './sessionCommands.mjs';

afterEach(() => {
	resetDbStub();
	vi.mocked(notificationsEnabled).mockReturnValue(true);
});

describe('remaining session actions: one legal and one illegal transition each', () => {
	it('resetSession: draft can reset to ended; an already-ended session cannot', async () => {
		queueResult([{ id: 'event-1' }]);
		await expect(resetSession(baseEvent({ status: 'draft' }))).resolves.toEqual({ ok: true });

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
			updateRegistration(baseEvent({ status: 'draft' }), override),
		).resolves.toMatchObject({ ok: false, status: 400 });
	});

	it('scheduleRegistration: a future draft can be scheduled; an open session cannot', async () => {
		const event = baseEvent({
			status: 'draft',
			registrationOpensAt: new Date(Date.now() + 3_600_000),
		});

		queueResult([{ id: 'event-1' }]);
		await expect(scheduleRegistration(event)).resolves.toEqual({ ok: true });

		await expect(
			scheduleRegistration(baseEvent({ status: 'registration_open' })),
		).resolves.toMatchObject({ ok: false, status: 409 });
	});

	it('postponeRegistration: a scheduled session can be postponed; a draft cannot', async () => {
		queueResult([{ id: 'event-1' }]);
		await expect(
			postponeRegistration(baseEvent({ status: 'scheduled' }), { minutes: 30 }),
		).resolves.toEqual({ ok: true });

		await expect(
			postponeRegistration(baseEvent({ status: 'draft' }), { minutes: 30 }),
		).resolves.toMatchObject({ ok: false, status: 409 });
	});

	it('openRegistration: a draft can open registration; an ended session cannot', async () => {
		queueResult([{ id: 'event-1' }]);
		await expect(openRegistration(baseEvent({ status: 'draft' }))).resolves.toEqual({ ok: true });

		await expect(openRegistration(baseEvent({ status: 'ended' }))).resolves.toMatchObject({
			ok: false,
			status: 409,
		});
	});

	it('reopenRegistration: a closed session can reopen; a draft cannot', async () => {
		queueResult([{ id: 'event-1' }]);
		await expect(reopenRegistration(baseEvent({ status: 'registration_closed' }))).resolves.toEqual(
			{ ok: true },
		);

		await expect(reopenRegistration(baseEvent({ status: 'draft' }))).resolves.toMatchObject({
			ok: false,
			status: 409,
		});
	});

	it('closeRegistration: an open session can close registration; a draft cannot', async () => {
		queueResult([{ id: 'event-1' }]); // tx.update ... returning
		queueResult([]); // no registered visits to notify
		await expect(closeRegistration(baseEvent({ status: 'registration_open' }))).resolves.toEqual({
			ok: true,
		});

		await expect(closeRegistration(baseEvent({ status: 'draft' }))).resolves.toMatchObject({
			ok: false,
			status: 409,
		});
	});

	it('closeSession: a started session can close; a draft session cannot', async () => {
		queueResult([{ id: 'event-1' }]);
		queueResult([]); // resolveOutstandingVisits — nobody left waiting or called
		await expect(closeSession(baseEvent({ status: 'service_started' }))).resolves.toEqual({
			ok: true,
		});

		await expect(closeSession(baseEvent({ status: 'draft' }))).resolves.toMatchObject({
			ok: false,
			status: 409,
		});
	});

	it('closeSession: resolves guests still waiting or called so nobody is stranded', async () => {
		queueResult([{ id: 'event-1' }]);
		queueResult([{ id: 'visit-1' }, { id: 'visit-2' }]);

		await expect(closeSession(baseEvent({ status: 'service_started' }))).resolves.toEqual({
			ok: true,
		});

		const noShowUpdate = db.update.mock.results
			.map(({ value }) => value as { set: ReturnType<typeof vi.fn> })
			.find(({ set }) => set.mock.calls.some(([changes]) => changes?.status === 'no_show'));

		expect(noShowUpdate).toBeDefined();
	});
});
