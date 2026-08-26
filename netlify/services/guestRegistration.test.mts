import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../test/dbStub.mjs';

vi.mock('../../db/index.mjs', () => ({ db }));

import {
	parseSignupSubmission,
	parseSubmission,
	registerGuest,
	registerGuestSignup,
} from './guestRegistration.mjs';

const savedDeviceToken = 'device-token-from-this-browser-12345678901234567890';

afterEach(() => {
	resetDbStub();
});

function selfSubmission(overrides: Record<string, unknown> = {}) {
	return {
		firstName: 'Ari',
		lastName: 'Guest',
		ageRange: '18-29',
		householdSize: 2,
		childrenCount: 0,
		seniorsCount: 0,
		phone: '555-123-4567',
		locale: 'en',
		deviceToken: null,
		marketEventId: 'event-1',
		...overrides,
	};
}

describe('parseSubmission', () => {
	it('parses a valid new self-registration', () => {
		const result = parseSubmission(selfSubmission());

		expect(result).toMatchObject({
			firstName: 'Ari',
			lastName: 'Guest',
			source: 'self',
			deviceToken: null,
			locale: 'en',
			marketEventId: 'event-1',
		});
	});

	it('defaults marketEventId to null when omitted', () => {
		const result = parseSubmission(selfSubmission({ marketEventId: undefined }));

		expect(result?.marketEventId).toBeNull();
	});

	it('rejects a missing phone number', () => {
		expect(parseSubmission(selfSubmission({ phone: '' }))).toBeNull();
	});

	it('rejects an unsupported locale', () => {
		expect(parseSubmission(selfSubmission({ locale: 'de' }))).toBeNull();
	});

	it('accepts a saved device token for a self-service submission', () => {
		expect(parseSubmission(selfSubmission({ deviceToken: savedDeviceToken }))).toMatchObject({
			deviceToken: savedDeviceToken,
		});
	});

	it('rejects a malformed device token instead of treating it as a new device', () => {
		expect(parseSubmission(selfSubmission({ deviceToken: 'too-short' }))).toBeNull();
	});

	it('ignores a device token on an admin submission', () => {
		const result = parseSubmission(selfSubmission({ source: 'admin', deviceToken: 'too-short' }));

		expect(result?.source).toBe('admin');
		expect(result?.deviceToken).toBeNull();
	});

	it('rejects non-string/number answer values', () => {
		expect(parseSubmission(selfSubmission({ answers: { q1: { nested: true } } }))).toBeNull();
	});

	it('rejects an invalid age range when a profile is required', () => {
		expect(parseSubmission(selfSubmission({ ageRange: 'not-a-range' }))).toBeNull();
	});

	it('rejects an out-of-range household size when a profile is required', () => {
		expect(parseSubmission(selfSubmission({ householdSize: 0 }))).toBeNull();
	});

	it('rejects shopper counts that add up to more than the household size', () => {
		expect(
			parseSubmission(selfSubmission({ householdSize: 2, childrenCount: 2, seniorsCount: 1 })),
		).toBeNull();
	});

	it('rejects a non-object payload', () => {
		expect(parseSubmission('not an object')).toBeNull();
		expect(parseSubmission(null)).toBeNull();
	});
});

describe('registerGuest eligibility', () => {
	it('rejects an admin submission with no market event configured', async () => {
		const submission = parseSubmission(selfSubmission({ source: 'admin', marketEventId: null }))!;

		const result = await registerGuest(submission);

		expect(result).toEqual({
			ok: false,
			status: 409,
			error: 'No market event has been configured.',
		});
	});

	it('rejects an admin submission naming a session that does not exist', async () => {
		queueResult([]);
		const submission = parseSubmission(selfSubmission({ source: 'admin' }))!;

		const result = await registerGuest(submission);

		expect(result).toEqual({
			ok: false,
			status: 409,
			error: 'No market event has been configured.',
		});
	});

	it.each([
		// The lottery is over once service starts, so a guest can no longer be entered into it.
		{ status: 'service_started', admission: 'lottery' },
		// A live session is not a place to record someone as already served.
		{ status: 'registration_open', admission: 'served' },
		// A finished session can only take an after-the-fact record.
		{ status: 'ended', admission: 'queue' },
	])('rejects a $admission admission while the session is $status', async (scenario) => {
		queueResult([{ status: scenario.status }]);
		const submission = parseSubmission(
			selfSubmission({ source: 'admin', admission: scenario.admission }),
		)!;

		const result = await registerGuest(submission);

		expect(result).toEqual({
			ok: false,
			status: 409,
			error: 'That way of adding a guest is not available while the session is in this state.',
		});
	});

	it('rejects a self submission with no market event selected', async () => {
		const submission = parseSubmission(selfSubmission({ marketEventId: null }))!;

		const result = await registerGuest(submission);

		expect(result).toEqual({ ok: false, status: 409, error: 'Registration is not open.' });
	});

	it('rejects a self submission when the market event does not exist', async () => {
		queueResult([]);
		const submission = parseSubmission(selfSubmission())!;

		const result = await registerGuest(submission);

		expect(result).toEqual({ ok: false, status: 409, error: 'Registration is not open.' });
	});

	it.each(['registration_closed', 'service_started', 'ended'])(
		'rejects a self submission once the session is %s',
		async (status) => {
			queueResult([
				{
					id: 'event-1',
					status,
					sessionMode: 'scheduled',
					registrationOpensAt: new Date(Date.now() - 120_000),
					registrationClosesAt: new Date(Date.now() - 60_000),
				},
			]);
			const submission = parseSubmission(selfSubmission())!;

			const result = await registerGuest(submission);

			expect(result).toEqual({ ok: false, status: 409, error: 'Registration is not open.' });
		},
	);

	it('allows a self submission while the session is still in draft', async () => {
		queueResult([
			{
				id: 'event-1',
				status: 'draft',
				sessionMode: 'scheduled',
				registrationOpensAt: new Date(Date.now() + 60_000),
				registrationClosesAt: new Date(Date.now() + 120_000),
			},
		]);
		queueResult([]); // no registration questions
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]); // insert guests
		queueResult([{ id: 'visit-1', status: 'registered' }]); // insert visits
		const submission = parseSubmission(selfSubmission())!;

		const result = await registerGuest(submission);

		expect(result.ok).toBe(true);
	});

	it('allows a self submission once the session is scheduled but not open yet', async () => {
		queueResult([
			{
				id: 'event-1',
				status: 'scheduled',
				sessionMode: 'scheduled',
				registrationOpensAt: new Date(Date.now() + 60_000),
				registrationClosesAt: new Date(Date.now() + 120_000),
			},
		]);
		queueResult([]); // no registration questions
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]); // insert guests
		queueResult([{ id: 'visit-1', status: 'registered' }]); // insert visits
		const submission = parseSubmission(selfSubmission())!;

		const result = await registerGuest(submission);

		expect(result.ok).toBe(true);
	});

	it('rejects a self submission missing a required registration answer', async () => {
		queueResult([
			{
				id: 'event-1',
				status: 'registration_open',
				sessionMode: 'scheduled',
				registrationOpensAt: new Date(Date.now() - 60_000),
				registrationClosesAt: new Date(Date.now() + 60_000),
			},
		]);
		queueResult([{ id: 'question-1', type: 'text', required: true }]);
		const submission = parseSubmission(selfSubmission({ answers: {} }))!;

		const result = await registerGuest(submission);

		expect(result).toEqual({
			ok: false,
			status: 400,
			error: 'Please answer all required registration questions.',
		});
	});

	it('rejects an out-of-range scale answer', async () => {
		queueResult([
			{
				id: 'event-1',
				status: 'registration_open',
				sessionMode: 'scheduled',
				registrationOpensAt: new Date(Date.now() - 60_000),
				registrationClosesAt: new Date(Date.now() + 60_000),
			},
		]);
		queueResult([{ id: 'question-1', type: 'scale', required: false }]);
		const submission = parseSubmission(selfSubmission({ answers: { 'question-1': 99 } }))!;

		const result = await registerGuest(submission);

		expect(result).toEqual({
			ok: false,
			status: 400,
			error: 'Please provide valid registration answers.',
		});
	});
});

describe('registerGuest happy paths', () => {
	const openEvent = {
		id: 'event-1',
		status: 'registration_open',
		sessionMode: 'scheduled',
		registrationOpensAt: new Date(Date.now() - 60_000),
		registrationClosesAt: new Date(Date.now() + 60_000),
	};

	/** The row handed to `insert(visits).values(...)`, dug out of the stubbed insert calls. */
	function insertedVisit() {
		return db.insert.mock.results
			.map(({ value }) => value as { values: ReturnType<typeof vi.fn> })
			.flatMap(({ values }) => values.mock.calls.map(([row]) => row))
			.find((row) => row?.guestId);
	}

	function insertedGuest() {
		return db.insert.mock.results
			.map(({ value }) => value as { values: ReturnType<typeof vi.fn> })
			.flatMap(({ values }) => values.mock.calls.map(([row]) => row))
			.find((row) => row?.deviceTokenHash);
	}

	function updatedGuest() {
		return db.update.mock.results
			.map(({ value }) => value as { set: ReturnType<typeof vi.fn> })
			.flatMap(({ set }) => set.mock.calls.map(([row]) => row))
			.find((row) => row?.firstName);
	}

	function updatedVisit() {
		return db.update.mock.results
			.map(({ value }) => value as { set: ReturnType<typeof vi.fn> })
			.flatMap(({ set }) => set.mock.calls.map(([row]) => row))
			.find((row) => row?.accessTokenHash);
	}

	it('creates a new guest and visit for a first-time self registration', async () => {
		queueResult([openEvent]);
		queueResult([]); // no registration questions
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]); // insert guests
		queueResult([{ id: 'visit-1', status: 'registered' }]); // insert visits
		const submission = parseSubmission(selfSubmission())!;

		const result = await registerGuest(submission);

		expect(result.ok).toBe(true);
		expect(result).toMatchObject({
			status: 201,
			body: { id: 'visit-1', guestId: 'guest-1', status: 'registered' },
		});
		expect((result as { body: { visitToken?: string } }).body.visitToken).toBeTruthy();
		const deviceToken = (result as { body: { deviceToken?: string } }).body.deviceToken;
		expect(deviceToken).toBeTruthy();
		expect(insertedGuest()?.deviceTokenHash).toBeTruthy();
		expect(insertedGuest()?.deviceTokenHash).not.toBe(deviceToken);
		expect(insertedVisit()?.normalizedPhone).toBe('+15551234567');
	});

	it('replaces an unrecognized device token while creating a redundant guest', async () => {
		queueResult([openEvent]);
		queueResult([]); // no registration questions
		queueResult([]); // submitted token does not identify a guest
		queueResult([{ id: 'guest-2', firstName: 'Ari' }]); // insert guests
		queueResult([{ id: 'visit-2', status: 'registered' }]); // insert visits
		const submission = parseSubmission(selfSubmission({ deviceToken: savedDeviceToken }))!;

		const result = await registerGuest(submission);

		expect(result).toMatchObject({ ok: true, status: 201, body: { guestId: 'guest-2' } });
		if (!result.ok) {
			throw new Error('Expected registration to succeed');
		}
		expect(result.body.deviceToken).toBeTruthy();
		expect(result.body.deviceToken).not.toBe(savedDeviceToken);
		expect(insertedGuest()?.deviceTokenHash).not.toBe(result.body.deviceToken);
	});

	it('updates the guest identity and refreshes the existing visit for an identified device', async () => {
		queueResult([openEvent]);
		queueResult([]); // no registration questions
		queueResult([{ id: 'guest-1', firstName: 'Old' }]); // device credential lookup
		queueResult([{ id: 'visit-1', status: 'waiting' }]); // existing visit lookup
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]); // tx.update guest returning
		queueResult([{ id: 'visit-1', status: 'waiting' }]); // tx.update visits returning
		const submission = parseSubmission(
			selfSubmission({
				deviceToken: savedDeviceToken,
				firstName: 'Renewed',
				phone: '555-999-0000',
				childrenCount: 1,
				seniorsCount: 0,
				householdSize: 3,
			}),
		)!;

		const result = await registerGuest(submission);

		expect(result).toMatchObject({
			ok: true,
			status: 200,
			body: { id: 'visit-1', guestId: 'guest-1', status: 'waiting' },
		});
		if (!result.ok) {
			throw new Error('Expected registration to succeed');
		}
		expect(db.update).toHaveBeenCalledTimes(2);
		expect(updatedGuest()).toMatchObject({
			firstName: 'Renewed',
			phone: '555-999-0000',
			normalizedPhone: '+15559990000',
		});
		// The guest row no longer carries household composition at all — resubmitting refreshes the
		// visit's own snapshot straight from this submission.
		expect(updatedVisit()).toMatchObject({
			normalizedPhone: '+15559990000',
			householdSize: 3,
			childrenCount: 1,
			seniorsCount: 0,
		});
		expect(result.body.deviceToken).toBeUndefined();
	});

	it('takes household composition from the submission, not the guest record, for a new visit', async () => {
		queueResult([openEvent]);
		queueResult([]); // no registration questions
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]); // device credential lookup
		queueResult([]); // no existing visit for this event
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]); // tx.update guest returning (identity only)
		queueResult([{ id: 'visit-1', status: 'registered' }]); // insert visits
		const submission = parseSubmission(
			selfSubmission({
				deviceToken: savedDeviceToken,
				ageRange: '30-44',
				householdSize: 4,
				childrenCount: 2,
				seniorsCount: 1,
			}),
		)!;

		await registerGuest(submission);

		expect(insertedVisit()).toMatchObject({
			ageRange: '30-44',
			householdSize: 4,
			childrenCount: 2,
			seniorsCount: 1,
		});
	});

	it('creates an admin-added guest directly into the waiting queue with no visit token', async () => {
		queueResult([{ status: 'service_started' }]); // admin event status check
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]); // insert guests
		queueResult([{ position: 6 }]); // nextQueuePosition — highest position so far
		queueResult([{ id: 'visit-1', status: 'waiting' }]); // insert visits
		const submission = parseSubmission(selfSubmission({ source: 'admin' }))!;

		const result = await registerGuest(submission);

		expect(result).toMatchObject({ ok: true, status: 201, body: { status: 'waiting' } });
		expect((result as { body: { visitToken?: string } }).body.visitToken).toBeUndefined();
	});

	it('appends a walk-in to the end of the queue by default', async () => {
		queueResult([{ status: 'service_started' }]);
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]);
		queueResult([{ position: 6 }]);
		queueResult([{ id: 'visit-1', status: 'waiting' }]);
		const submission = parseSubmission(selfSubmission({ source: 'admin' }))!;

		expect(submission.queuePlacement).toBe('end');
		await registerGuest(submission);

		expect(insertedVisit()?.queuePosition).toBe(7);
	});

	it('enters a pre-lottery guest into the draw with no queue position', async () => {
		queueResult([{ status: 'registration_open' }]); // admin event status check
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]); // insert guests
		queueResult([{ id: 'visit-1', status: 'registered' }]); // insert visits
		const submission = parseSubmission(selfSubmission({ source: 'admin', admission: 'lottery' }))!;

		const result = await registerGuest(submission);

		expect(result).toMatchObject({ ok: true, status: 201, body: { status: 'registered' } });
		expect(insertedVisit()?.queuePosition).toBeNull();
	});

	it('stores the weight a worker chose for a guest entering the draw', async () => {
		queueResult([{ status: 'registration_open' }]);
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]);
		queueResult([{ id: 'visit-1', status: 'registered' }]);
		const submission = parseSubmission(
			selfSubmission({ source: 'admin', admission: 'lottery', lotteryWeight: 5 }),
		)!;

		await registerGuest(submission);

		expect(insertedVisit()?.lotteryWeight).toBe(5);
	});

	it('ignores a weight on a guest who is not going into the draw', async () => {
		queueResult([{ status: 'service_started' }]);
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]);
		queueResult([{ position: 6 }]);
		queueResult([{ id: 'visit-1', status: 'waiting' }]);
		const submission = parseSubmission(
			selfSubmission({ source: 'admin', admission: 'queue', lotteryWeight: 5 }),
		)!;

		await registerGuest(submission);

		// They already have a spot — weighting a draw they are not in would just be misleading data.
		expect(insertedVisit()?.lotteryWeight).toBe(1);
	});

	it('leaves a self-registration on even odds whatever the payload claims', async () => {
		queueResult([openEvent]);
		queueResult([]); // no registration questions
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]);
		queueResult([{ id: 'visit-1', status: 'registered' }]);
		const submission = parseSubmission(selfSubmission({ lotteryWeight: 99 }))!;

		await registerGuest(submission);

		// The weight is a worker's judgement call; a guest cannot award it to themselves.
		expect(insertedVisit()?.lotteryWeight).toBe(1);
	});

	it('records a guest served out of band once the session has ended', async () => {
		queueResult([{ status: 'ended' }]); // admin event status check
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]); // insert guests
		queueResult([{ id: 'visit-1', status: 'served' }]); // insert visits
		const submission = parseSubmission(selfSubmission({ source: 'admin', admission: 'served' }))!;

		const result = await registerGuest(submission);

		expect(result).toMatchObject({ ok: true, status: 201, body: { status: 'served' } });
		// A record of someone already fed never joins a line.
		expect(insertedVisit()?.queuePosition).toBeNull();
	});

	it('puts a walk-in at the front of the queue when the worker asks for next up', async () => {
		queueResult([{ status: 'service_started' }]);
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]);
		queueResult([{ position: 6 }]); // highest position so far
		queueResult([{ position: 3 }]); // front of the waiting guests
		queueResult([]); // shift the waiting guests down by one
		queueResult([{ id: 'visit-1', status: 'waiting' }]);
		const submission = parseSubmission(
			selfSubmission({ source: 'admin', queuePlacement: 'next' }),
		)!;

		expect(submission.queuePlacement).toBe('next');
		await registerGuest(submission);

		expect(insertedVisit()?.queuePosition).toBe(3);
	});
});

function signupSubmission(overrides: Record<string, unknown> = {}) {
	return {
		firstName: 'Ari',
		lastName: 'Guest',
		phone: '555-123-4567',
		locale: 'en',
		deviceToken: null,
		...overrides,
	};
}

describe('parseSignupSubmission', () => {
	it('parses a valid sign-up with no device token', () => {
		expect(parseSignupSubmission(signupSubmission())).toEqual({
			firstName: 'Ari',
			lastName: 'Guest',
			phone: '555-123-4567',
			locale: 'en',
			deviceToken: null,
		});
	});

	it('accepts a saved device token', () => {
		expect(
			parseSignupSubmission(signupSubmission({ deviceToken: savedDeviceToken })),
		).toMatchObject({
			deviceToken: savedDeviceToken,
		});
	});

	it('rejects a malformed device token', () => {
		expect(parseSignupSubmission(signupSubmission({ deviceToken: 'too-short' }))).toBeNull();
	});

	it('rejects a missing phone number', () => {
		expect(parseSignupSubmission(signupSubmission({ phone: '' }))).toBeNull();
	});

	it('rejects an unsupported locale', () => {
		expect(parseSignupSubmission(signupSubmission({ locale: 'de' }))).toBeNull();
	});

	it('rejects a missing first or last name', () => {
		expect(parseSignupSubmission(signupSubmission({ firstName: '' }))).toBeNull();
		expect(parseSignupSubmission(signupSubmission({ lastName: '' }))).toBeNull();
	});

	it('rejects a non-object payload', () => {
		expect(parseSignupSubmission('not an object')).toBeNull();
		expect(parseSignupSubmission(null)).toBeNull();
	});
});

describe('registerGuestSignup', () => {
	function insertedGuest() {
		return db.insert.mock.results
			.map(({ value }) => value as { values: ReturnType<typeof vi.fn> })
			.flatMap(({ values }) => values.mock.calls.map(([row]) => row))
			.find((row) => row?.deviceTokenHash !== undefined);
	}

	function updatedGuest() {
		return db.update.mock.results
			.map(({ value }) => value as { set: ReturnType<typeof vi.fn> })
			.flatMap(({ set }) => set.mock.calls.map(([row]) => row))
			.find((row) => row?.firstName);
	}

	it('creates a new guest and issues a device token for a first-time sign-up', async () => {
		queueResult([{ id: 'guest-1' }]); // insert guests

		const result = await registerGuestSignup(parseSignupSubmission(signupSubmission())!);

		expect(result.ok).toBe(true);
		expect(result).toMatchObject({ status: 201, body: { guestId: 'guest-1' } });
		if (!result.ok) {
			throw new Error('Expected sign-up to succeed');
		}
		expect(result.body.deviceToken).toBeTruthy();
		expect(insertedGuest()?.deviceTokenHash).toBeTruthy();
		expect(db.update).not.toHaveBeenCalled();
	});

	it('never touches visits for a sign-up', async () => {
		queueResult([{ id: 'guest-1' }]); // insert guests

		await registerGuestSignup(parseSignupSubmission(signupSubmission())!);

		expect(db.select).not.toHaveBeenCalled();
	});

	it('updates only the identity fields for an already-identified device', async () => {
		queueResult([{ id: 'guest-1', firstName: 'Old' }]); // device credential lookup
		queueResult([{ id: 'guest-1', firstName: 'Renewed' }]); // tx.update guest returning

		const result = await registerGuestSignup(
			parseSignupSubmission(
				signupSubmission({ deviceToken: savedDeviceToken, firstName: 'Renewed' }),
			)!,
		);

		expect(result).toMatchObject({ ok: true, status: 200, body: { guestId: 'guest-1' } });
		if (!result.ok) {
			throw new Error('Expected sign-up to succeed');
		}
		expect(result.body.deviceToken).toBeUndefined();
		expect(updatedGuest()).toMatchObject({ firstName: 'Renewed' });
		expect(db.insert).not.toHaveBeenCalled();
	});

	it('replaces an unrecognized device token with a new guest and token', async () => {
		queueResult([]); // submitted token does not identify a guest
		queueResult([{ id: 'guest-2' }]); // insert guests

		const result = await registerGuestSignup(
			parseSignupSubmission(signupSubmission({ deviceToken: savedDeviceToken }))!,
		);

		expect(result).toMatchObject({ ok: true, status: 201, body: { guestId: 'guest-2' } });
		if (!result.ok) {
			throw new Error('Expected sign-up to succeed');
		}
		expect(result.body.deviceToken).toBeTruthy();
		expect(result.body.deviceToken).not.toBe(savedDeviceToken);
	});
});
