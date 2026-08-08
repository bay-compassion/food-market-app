import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../test/dbStub.js';

vi.mock('../../db/index.js', () => ({ db }));
vi.mock('./pushNotifications.js', () => ({ notificationsEnabled: vi.fn(() => true) }));

import {
	closeRegistration,
	closeSession,
	getCurrentEvent,
	openRegistration,
	parseSettings,
	postponeRegistration,
	reopenRegistration,
	resetSession,
	runLottery,
	saveSettings,
	scheduleRegistration,
	updateRegistration,
	type MarketEventRow,
} from './marketSession.js';
import { notificationsEnabled } from './pushNotifications.js';

afterEach(() => {
	resetDbStub();
	vi.mocked(notificationsEnabled).mockReturnValue(true);
});

function baseEvent(overrides: Partial<MarketEventRow> = {}): MarketEventRow {
	return {
		id: 'event-1',
		status: 'draft',
		sessionMode: 'scheduled',
		capacity: 10,
		registrationOpensAt: new Date(Date.now() - 3_600_000),
		registrationClosesAt: new Date(Date.now() + 3_600_000),
		createdAt: new Date(),
		...overrides,
	} as MarketEventRow;
}

describe('parseSettings', () => {
	function validBody(overrides: Record<string, unknown> = {}) {
		return {
			registrationOpensAt: new Date(Date.now()).toISOString(),
			registrationClosesAt: new Date(Date.now() + 3_600_000).toISOString(),
			capacity: 50,
			questions: [{ prompt: 'How many in your household?', type: 'text', required: true }],
			...overrides,
		};
	}

	it('parses a valid settings payload', () => {
		const result = parseSettings(validBody());

		expect(result).toMatchObject({ capacity: 50, sessionMode: 'scheduled' });
		expect(result?.questions).toHaveLength(1);
	});

	it('defaults sessionMode to scheduled and accepts ad_hoc explicitly', () => {
		expect(parseSettings(validBody())?.sessionMode).toBe('scheduled');
		expect(parseSettings(validBody({ sessionMode: 'ad_hoc' }))?.sessionMode).toBe('ad_hoc');
	});

	it('rejects when registration closes before or at the same time it opens', () => {
		expect(
			parseSettings(
				validBody({
					registrationOpensAt: new Date(Date.now() + 3_600_000).toISOString(),
					registrationClosesAt: new Date(Date.now()).toISOString(),
				}),
			),
		).toBeNull();
	});

	it('rejects a non-integer or out-of-range capacity', () => {
		expect(parseSettings(validBody({ capacity: 0 }))).toBeNull();
		expect(parseSettings(validBody({ capacity: 1.5 }))).toBeNull();
		expect(parseSettings(validBody({ capacity: 20_000 }))).toBeNull();
	});

	it('rejects when questions is not an array', () => {
		expect(parseSettings(validBody({ questions: 'not-an-array' }))).toBeNull();
	});

	it('rejects a question with an empty or overlong prompt', () => {
		expect(parseSettings(validBody({ questions: [{ prompt: '', type: 'text' }] }))).toBeNull();
		expect(
			parseSettings(validBody({ questions: [{ prompt: 'x'.repeat(301), type: 'text' }] })),
		).toBeNull();
	});

	it('defaults an unrecognized question type to text', () => {
		const result = parseSettings(validBody({ questions: [{ prompt: 'Q', type: 'weird' }] }));

		expect(result?.questions[0]?.type).toBe('text');
	});

	it('rejects a non-object payload', () => {
		expect(parseSettings(null)).toBeNull();
		expect(parseSettings('nope')).toBeNull();
	});
});

describe('saveSettings', () => {
	const settings = {
		registrationOpensAt: new Date(),
		registrationClosesAt: new Date(Date.now() + 3_600_000),
		capacity: 20,
		questions: [{ prompt: 'Q', type: 'text' as const, required: false }],
		sessionMode: 'scheduled' as const,
	};

	it('creates a new event and its questions when none exists', async () => {
		queueResult([]); // getCurrentEvent -> getLatestActiveEvent: none
		queueResult([{ id: 'event-1' }]); // insert marketEvents ... returning
		queueResult(undefined); // insert registrationQuestions

		const result = await saveSettings(settings);

		expect(result).toEqual({ ok: true });
		expect(db.insert).toHaveBeenCalledTimes(2);
	});

	it('updates an existing draft event', async () => {
		queueResult([baseEvent({ status: 'draft' })]); // getLatestActiveEvent
		queueResult([{ id: 'event-1' }]); // update ... returning
		queueResult(undefined); // delete registrationQuestions
		queueResult(undefined); // insert registrationQuestions

		const result = await saveSettings(settings);

		expect(result).toEqual({ ok: true });
	});

	it('rejects changes once registration has already opened', async () => {
		queueResult([baseEvent({ status: 'registration_open' })]);

		const result = await saveSettings(settings);

		expect(result).toEqual({
			ok: false,
			status: 409,
			error: 'Session settings can only be changed before registration opens.',
		});
	});

	it('rejects on an optimistic-concurrency conflict (event changed status mid-save)', async () => {
		queueResult([baseEvent({ status: 'draft' })]); // getCurrentEvent sees draft
		queueResult([]); // but the update inside the transaction matches zero rows

		const result = await saveSettings(settings);

		expect(result).toEqual({
			ok: false,
			status: 409,
			error: 'Session settings can only be changed before registration opens.',
		});
	});
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
});

describe('runLottery', () => {
	const identity = <T>(items: T[]) => items;

	it('returns 409 when the lottery cannot run from the current status', async () => {
		const result = await runLottery(baseEvent({ status: 'draft' }));

		expect(result).toEqual({
			ok: false,
			status: 409,
			error: 'The lottery can only run after registration closes.',
		});
		expect(db.select).not.toHaveBeenCalled();
	});

	it('selects up to capacity and marks the remainder not_placed, in shuffle order', async () => {
		const event = baseEvent({ status: 'registration_closed', capacity: 2 });
		queueResult([{ id: 'v1' }, { id: 'v2' }, { id: 'v3' }]); // registered visits
		queueResult([{ id: 'event-1' }]); // tx.update marketEvents ... returning (started)
		queueResult(undefined); // tx.execute (bulk queue-position update for selected)
		queueResult(undefined); // tx.insert notificationDeliveries (selected)
		queueResult(undefined); // tx.update visits set not_placed
		queueResult(undefined); // tx.insert notificationDeliveries (not placed)
		queueResult([baseEvent({ status: 'service_started' })]); // refresh getCurrentEvent

		const result = await runLottery(event, identity);

		expect(result).toEqual({ ok: true });
	});

	it('skips the bulk update and notification inserts when there are no registrations', async () => {
		const event = baseEvent({ status: 'registration_closed', capacity: 5 });
		queueResult([]); // no registered visits
		queueResult([{ id: 'event-1' }]); // tx.update marketEvents ... returning
		queueResult([baseEvent({ status: 'service_started' })]); // refresh

		const result = await runLottery(event, identity);

		expect(result).toEqual({ ok: true });
		expect(db.execute).not.toHaveBeenCalled();
	});

	it('returns 409 when a concurrent process already moved the session before the lottery started', async () => {
		const event = baseEvent({ status: 'registration_closed', capacity: 5 });
		queueResult([]); // registrations
		queueResult([]); // tx.update ... returning — no row matched, lost the race
		queueResult([baseEvent({ status: 'registration_closed' })]); // refresh still shows the old status

		const result = await runLottery(event, identity);

		expect(result).toEqual({
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		});
	});
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
