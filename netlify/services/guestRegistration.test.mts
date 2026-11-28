import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../test/dbStub.mjs';

vi.mock('../../db/index.mjs', () => ({ db }));
// History entries are an extra insert in each write's transaction; tested in visit-events.test.mts.
vi.mock('./visit-events.mjs', () => ({
	recordVisitEvents: vi.fn(),
	listVisitEvents: vi.fn(),
	guestActor: { kind: 'guest' },
	systemActor: { kind: 'system' },
}));

import { parseGuestInformation, saveGuestInformation } from './guest-information.mjs';
import { parseSubmission, registerGuest, validateSubmission } from './guestRegistration.mjs';
import { recordVisitEvents } from './visit-events.mjs';

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
			parseSubmission(
				selfSubmission({
					householdSize: 2,
					childrenCount: 2,
					seniorsCount: 1,
				}),
			),
		).toBeNull();
	});

	it('rejects a non-object payload', () => {
		expect(parseSubmission('not an object')).toBeNull();
		expect(parseSubmission(null)).toBeNull();
	});
});

describe('validateSubmission', () => {
	it('hands on the household counts as numbers', () => {
		// Arrange
		const submission = selfSubmission({ householdSize: '3', childrenCount: '1', seniorsCount: 0 });

		// Act
		const result = validateSubmission(submission);

		// Assert
		expect(result).toMatchObject({
			success: true,
			data: { householdSize: 3, childrenCount: 1, seniorsCount: 0 },
		});
	});

	it('names the household as too small for its children and seniors', () => {
		// Arrange
		const submission = selfSubmission({ householdSize: 2, childrenCount: 2, seniorsCount: 1 });

		// Act
		const result = validateSubmission(submission);

		// Assert
		expect(result).toEqual({
			success: false,
			error: 'Children and seniors together cannot be more than the household size.',
			fields: { householdSize: 'exceeds-household' },
		});
	});

	it('refuses a household of only children', () => {
		// Arrange
		const submission = selfSubmission({ householdSize: 1, childrenCount: 1, seniorsCount: 0 });

		// Act
		const result = validateSubmission(submission);

		// Assert
		expect(result).toEqual({
			success: false,
			error:
				'A household must include at least one adult, since children cannot shop on their own.',
			fields: { childrenCount: 'no-adult' },
		});
	});

	it('names each count that is not a whole number', () => {
		// Arrange
		const submission = selfSubmission({ householdSize: 2.5, seniorsCount: '1.5' });

		// Act
		const result = validateSubmission(submission);

		// Assert
		expect(result).toEqual({
			success: false,
			error: 'Household size must be a whole number. Number of seniors must be a whole number.',
			fields: { householdSize: 'not-whole-number', seniorsCount: 'not-whole-number' },
		});
	});

	it('does not read an empty count as zero', () => {
		// Arrange
		const submission = selfSubmission({ childrenCount: '' });

		// Act
		const result = validateSubmission(submission);

		// Assert
		expect(result).toEqual({
			success: false,
			error: 'Number of children is required.',
			fields: { childrenCount: 'required' },
		});
	});

	it('names a count outside its range', () => {
		// Arrange
		const submission = selfSubmission({ householdSize: 31 });

		// Act
		const result = validateSubmission(submission);

		// Assert
		expect(result).toMatchObject({
			success: false,
			error: 'Household size must be from 1 to 30.',
		});
	});

	it('names the field behind any other refusal', () => {
		// Arrange
		const submission = selfSubmission({ ageRange: 'not-a-range' });

		// Act
		const result = validateSubmission(submission);

		// Assert
		expect(result).toMatchObject({
			success: false,
			error: expect.stringMatching(/^Age range: /),
			fields: { ageRange: 'invalid_value' },
		});
	});

	it('names a name given only as initials', () => {
		// Arrange
		const submission = selfSubmission({ firstName: 'A.', lastName: 'G' });

		// Act
		const result = validateSubmission(submission);

		// Assert
		expect(result).toMatchObject({
			success: false,
			error:
				'First name: Write out the whole name, not just the first letter. Last name: Write out the whole name, not just the first letter.',
			fields: { firstName: 'custom', lastName: 'custom' },
		});
	});

	it('refuses initials from a worker adding a guest, too', () => {
		// Arrange
		const submission = selfSubmission({ source: 'admin', lastName: 'G.' });

		// Act
		const result = validateSubmission(submission);

		// Assert
		expect(result).toMatchObject({ success: false, fields: { lastName: 'custom' } });
	});
});

describe('race and ethnicity', () => {
	it('hands on a valid answer in federal order', () => {
		// Arrange
		const submission = selfSubmission({ raceEthnicity: { codes: ['white', 'asian'] } });

		// Act
		const result = parseSubmission(submission);

		// Assert
		expect(result).toMatchObject({
			raceEthnicity: { codes: ['asian', 'white'], otherText: null },
		});
	});

	it('keeps only "prefer not to answer" when it is sent with other choices', () => {
		// Arrange
		const submission = selfSubmission({
			raceEthnicity: { codes: ['white', 'prefer_not_to_answer'] },
		});

		// Act
		const result = parseSubmission(submission);

		// Assert
		expect(result).toMatchObject({
			raceEthnicity: { codes: ['prefer_not_to_answer'], otherText: null },
		});
	});

	it('names a missing self-description for "some other race and/or ethnicity"', () => {
		// Arrange
		const submission = selfSubmission({ raceEthnicity: { codes: ['another'], otherText: ' ' } });

		// Act
		const result = validateSubmission(submission);

		// Assert
		expect(result).toMatchObject({
			success: false,
			fields: { 'raceEthnicity.otherText': 'other-text-required' },
		});
	});

	it('refuses a code outside the federal list', () => {
		// Arrange
		const submission = selfSubmission({ raceEthnicity: { codes: ['martian'] } });

		// Act
		const result = validateSubmission(submission);

		// Assert
		expect(result.success).toBe(false);
	});

	it('treats nothing ticked as no answer, leaving what is stored alone', () => {
		// Arrange
		const submission = selfSubmission({ raceEthnicity: { codes: [] } });

		// Act
		const result = parseSubmission(submission);

		// Assert
		expect(result).not.toBeNull();
		expect(result).not.toHaveProperty('raceEthnicity.codes');
	});

	it("ignores an answer on a worker's submission", () => {
		// Arrange
		const submission = selfSubmission({ source: 'admin', raceEthnicity: { codes: ['asian'] } });

		// Act
		const result = parseSubmission(submission);

		// Assert
		expect(result).not.toHaveProperty('raceEthnicity');
	});
});

describe('registerGuest eligibility', () => {
	it('rejects an admin submission with no market event configured', async () => {
		const submission = parseSubmission(selfSubmission({ source: 'admin', marketEventId: null }))!;

		const result = await registerGuest(submission, { kind: 'guest' });

		expect(result).toEqual({
			ok: false,
			status: 409,
			error: 'No market event has been configured.',
		});
	});

	it('rejects an admin submission naming a session that does not exist', async () => {
		queueResult([]);
		const submission = parseSubmission(selfSubmission({ source: 'admin' }))!;

		const result = await registerGuest(submission, { kind: 'guest' });

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
			selfSubmission({
				source: 'admin',
				admission: scenario.admission,
			}),
		)!;

		const result = await registerGuest(submission, { kind: 'guest' });

		expect(result).toEqual({
			ok: false,
			status: 409,
			error: 'That way of adding a guest is not available while the session is in this state.',
		});
	});

	it('rejects a self submission with no market event selected', async () => {
		const submission = parseSubmission(selfSubmission({ marketEventId: null }))!;

		const result = await registerGuest(submission, { kind: 'guest' });

		expect(result).toEqual({
			ok: false,
			status: 409,
			error: 'Registration is not open.',
		});
	});

	it('rejects a self submission when the market event does not exist', async () => {
		queueResult([]);
		const submission = parseSubmission(selfSubmission())!;

		const result = await registerGuest(submission, { kind: 'guest' });

		expect(result).toEqual({
			ok: false,
			status: 409,
			error: 'Registration is not open.',
		});
	});

	it.each(['lottery_pending', 'service_started', 'ended'])(
		'rejects a self submission once the session is %s',
		async (status) => {
			queueResult([
				{
					id: 'event-1',
					status,
					registrationOpensAt: new Date(Date.now() - 120_000),
					registrationClosesAt: new Date(Date.now() - 60_000),
				},
			]);
			const submission = parseSubmission(selfSubmission())!;

			const result = await registerGuest(submission, { kind: 'guest' });

			expect(result).toEqual({
				ok: false,
				status: 409,
				error: 'Registration is not open.',
			});
		},
	);

	it('rejects a self submission before a scheduled session opens', async () => {
		queueResult([
			{
				id: 'event-1',
				status: 'scheduled',
				registrationOpensAt: new Date(Date.now() + 60_000),
				registrationClosesAt: new Date(Date.now() + 120_000),
			},
		]);
		const submission = parseSubmission(selfSubmission())!;

		const result = await registerGuest(submission, { kind: 'guest' });

		expect(result).toEqual({
			ok: false,
			status: 409,
			error: 'Registration is not open.',
		});
	});

	it('rejects a self submission once the session is scheduled but not open yet', async () => {
		queueResult([
			{
				id: 'event-1',
				status: 'scheduled',
				registrationOpensAt: new Date(Date.now() + 60_000),
				registrationClosesAt: new Date(Date.now() + 120_000),
			},
		]);
		const submission = parseSubmission(selfSubmission())!;

		const result = await registerGuest(submission, { kind: 'guest' });

		expect(result).toEqual({
			ok: false,
			status: 409,
			error: 'Registration is not open.',
		});
	});

	it('accepts an in-flight self submission during the post-close grace period', async () => {
		const graceEvent = {
			id: 'event-1',
			status: 'registration_closed',
			registrationOpensAt: new Date(Date.now() - 120_000),
			registrationClosesAt: new Date(Date.now() - 10_000),
			registrationGraceEndsAt: new Date(Date.now() + 20_000),
		};

		queueResult([graceEvent]);
		queueResult([]); // no registration questions
		queueResult([graceEvent]); // locked event eligibility recheck
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]);
		queueResult([{ id: 'visit-1', status: 'registered' }]);

		const result = await registerGuest(parseSubmission(selfSubmission())!, {
			kind: 'guest',
		});

		expect(result).toMatchObject({ ok: true, status: 201 });
	});

	it('rejects a self submission after the post-close grace period', async () => {
		queueResult([
			{
				id: 'event-1',
				status: 'registration_closed',
				registrationOpensAt: new Date(Date.now() - 120_000),
				registrationClosesAt: new Date(Date.now() - 60_000),
				registrationGraceEndsAt: new Date(Date.now() - 30_000),
			},
		]);

		const result = await registerGuest(parseSubmission(selfSubmission())!, {
			kind: 'guest',
		});

		expect(result).toEqual({
			ok: false,
			status: 409,
			error: 'Registration is not open.',
		});
	});

	it('rejects a self submission missing a required registration answer', async () => {
		queueResult([
			{
				id: 'event-1',
				status: 'registration_open',
				registrationOpensAt: new Date(Date.now() - 60_000),
				registrationClosesAt: new Date(Date.now() + 60_000),
			},
		]);
		queueResult([{ id: 'question-1', type: 'text', required: true }]);
		const submission = parseSubmission(selfSubmission({ answers: {} }))!;

		const result = await registerGuest(submission, { kind: 'guest' });

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
				registrationOpensAt: new Date(Date.now() - 60_000),
				registrationClosesAt: new Date(Date.now() + 60_000),
			},
		]);
		queueResult([{ id: 'question-1', type: 'scale', required: false }]);
		const submission = parseSubmission(selfSubmission({ answers: { 'question-1': 99 } }))!;

		const result = await registerGuest(submission, { kind: 'guest' });

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
		queueResult([openEvent]); // locked event eligibility recheck
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]); // insert guests
		queueResult([{ id: 'visit-1', status: 'registered' }]); // insert visits
		const submission = parseSubmission(selfSubmission())!;

		const result = await registerGuest(submission, { kind: 'guest' });

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

	it("saves a new guest's answer and tells their phone it was answered", async () => {
		// Arrange
		queueResult([openEvent]);
		queueResult([]); // no registration questions
		queueResult([openEvent]); // locked event eligibility recheck
		queueResult([{ id: 'guest-1', firstName: 'Ari', raceEthnicity: ['another'] }]); // insert guests
		queueResult([{ id: 'visit-1', status: 'registered' }]); // insert visits
		const submission = parseSubmission(
			selfSubmission({ raceEthnicity: { codes: ['another'], otherText: ' Cape Verdean ' } }),
		)!;

		// Act
		const result = await registerGuest(submission, { kind: 'guest' });

		// Assert
		expect(result).toMatchObject({ ok: true, body: { raceEthnicityAnswered: true } });
		expect(insertedGuest()).toMatchObject({
			raceEthnicity: ['another'],
			raceEthnicityOther: 'Cape Verdean',
		});
		// Identity, not a per-visit snapshot.
		expect(insertedVisit()).not.toHaveProperty('raceEthnicity');
	});

	it('leaves a stored answer alone when the phone sends none', async () => {
		// Arrange
		queueResult([openEvent]);
		queueResult([]); // no registration questions
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]); // device credential lookup
		queueResult([]); // no visit to this session yet
		queueResult([{ id: 'visit-0' }]); // an earlier visit
		queueResult([openEvent]); // locked event eligibility recheck
		queueResult([{ id: 'guest-1', firstName: 'Ari', raceEthnicity: ['white'] }]); // update guest
		queueResult([{ id: 'visit-1', status: 'registered' }]); // insert visits
		const submission = parseSubmission(selfSubmission({ deviceToken: savedDeviceToken }))!;

		// Act
		const result = await registerGuest(submission, { kind: 'guest' });

		// Assert
		expect(result).toMatchObject({ ok: true, body: { raceEthnicityAnswered: true } });
		expect(updatedGuest()?.raceEthnicity).toBeUndefined();
		expect(updatedGuest()?.raceEthnicityOther).toBeUndefined();
	});

	it('replaces an unrecognized device token while creating a redundant guest', async () => {
		queueResult([openEvent]);
		queueResult([]); // no registration questions
		queueResult([]); // submitted token does not identify a guest
		queueResult([openEvent]); // locked event eligibility recheck
		queueResult([{ id: 'guest-2', firstName: 'Ari' }]); // insert guests
		queueResult([{ id: 'visit-2', status: 'registered' }]); // insert visits
		const submission = parseSubmission(selfSubmission({ deviceToken: savedDeviceToken }))!;

		const result = await registerGuest(submission, { kind: 'guest' });

		expect(result).toMatchObject({
			ok: true,
			status: 201,
			body: { guestId: 'guest-2' },
		});

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
		queueResult([openEvent]); // locked event eligibility recheck
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

		const result = await registerGuest(submission, { kind: 'guest' });

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
		queueResult([{ id: 'visit-0' }]); // an earlier visit to another session
		queueResult([openEvent]); // locked event eligibility recheck
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

		await registerGuest(submission, { kind: 'guest' });

		expect(insertedVisit()).toMatchObject({
			ageRange: '30-44',
			householdSize: 4,
			childrenCount: 2,
			seniorsCount: 1,
		});
	});

	it('flags a first visit for a known guest who has never visited, such as an early sign-up', async () => {
		// Arrange
		queueResult([openEvent]);
		queueResult([]); // no registration questions
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]); // device credential lookup
		queueResult([]); // no existing visit for this event
		queueResult([]); // no visit to any other session either
		queueResult([openEvent]); // locked event eligibility recheck
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]); // tx.update guest returning
		queueResult([{ id: 'visit-1', status: 'registered' }]); // insert visits
		const submission = parseSubmission(selfSubmission({ deviceToken: savedDeviceToken }))!;

		// Act
		await registerGuest(submission, { kind: 'guest' });

		// Assert
		expect(insertedVisit()?.isFirstVisit).toBe(true);
	});

	it('does not flag a first visit for a known guest who visited before', async () => {
		// Arrange
		queueResult([openEvent]);
		queueResult([]); // no registration questions
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]); // device credential lookup
		queueResult([]); // no existing visit for this event
		queueResult([{ id: 'visit-0' }]); // an earlier visit to another session
		queueResult([openEvent]); // locked event eligibility recheck
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]); // tx.update guest returning
		queueResult([{ id: 'visit-1', status: 'registered' }]); // insert visits
		const submission = parseSubmission(selfSubmission({ deviceToken: savedDeviceToken }))!;

		// Act
		await registerGuest(submission, { kind: 'guest' });

		// Assert
		expect(insertedVisit()?.isFirstVisit).toBe(false);
	});

	it('creates an admin-added guest directly into the waiting queue with no visit token', async () => {
		queueResult([{ status: 'service_started' }]); // admin event status check
		queueResult([{ status: 'service_started' }]); // locked event eligibility recheck
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]); // insert guests
		queueResult([{ id: 'event-1' }]); // placeInLine — the session lock
		queueResult([
			{
				highestNumber: 6,
				highestPriorityNumber: null,
				highestOrder: 6,
				othersWaiting: 4,
			},
		]); // the line so far
		queueResult([{ id: 'visit-1', status: 'waiting' }]); // insert visits
		const submission = parseSubmission(selfSubmission({ source: 'admin' }))!;

		const result = await registerGuest(submission, { kind: 'guest' });

		expect(result).toMatchObject({
			ok: true,
			status: 201,
			body: { status: 'waiting' },
		});
		expect((result as { body: { visitToken?: string } }).body.visitToken).toBeUndefined();
	});

	it('appends a walk-in to the end of the queue by default', async () => {
		queueResult([{ status: 'service_started' }]);
		queueResult([{ status: 'service_started' }]); // locked event eligibility recheck
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]);
		queueResult([{ id: 'event-1' }]); // placeInLine — the session lock
		queueResult([
			{
				highestNumber: 6,
				highestPriorityNumber: null,
				highestOrder: 6,
				othersWaiting: 4,
			},
		]); // the line so far
		queueResult([{ id: 'visit-1', status: 'waiting' }]);
		const submission = parseSubmission(selfSubmission({ source: 'admin' }))!;

		expect(submission.queuePlacement).toBe('end');
		await registerGuest(submission, { kind: 'guest' });

		expect(insertedVisit()).toMatchObject({
			queuePosition: 7,
			queueFront: false,
			queueOrder: 7,
		});
	});

	it('enters a pre-lottery guest into the draw with no queue position', async () => {
		queueResult([{ status: 'registration_open' }]); // admin event status check
		queueResult([{ status: 'registration_open' }]); // locked event eligibility recheck
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]); // insert guests
		queueResult([{ id: 'visit-1', status: 'registered' }]); // insert visits
		const submission = parseSubmission(selfSubmission({ source: 'admin', admission: 'lottery' }))!;

		const result = await registerGuest(submission, { kind: 'guest' });

		expect(result).toMatchObject({
			ok: true,
			status: 201,
			body: { status: 'registered' },
		});
		expect(insertedVisit()?.queuePosition ?? null).toBeNull();
	});

	it('stores the weight a worker chose for a guest entering the draw', async () => {
		queueResult([{ status: 'registration_open' }]);
		queueResult([{ status: 'registration_open' }]); // locked event eligibility recheck
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]);
		queueResult([{ id: 'visit-1', status: 'registered' }]);
		const submission = parseSubmission(
			selfSubmission({
				source: 'admin',
				admission: 'lottery',
				lotteryWeight: 5,
			}),
		)!;

		await registerGuest(submission, { kind: 'guest' });

		expect(insertedVisit()?.lotteryWeight).toBe(5);
	});

	it('ignores a weight on a guest who is not going into the draw', async () => {
		queueResult([{ status: 'service_started' }]);
		queueResult([{ status: 'service_started' }]); // locked event eligibility recheck
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]);
		queueResult([{ id: 'event-1' }]); // placeInLine — the session lock
		queueResult([
			{
				highestNumber: 6,
				highestPriorityNumber: null,
				highestOrder: 6,
				othersWaiting: 4,
			},
		]); // the line so far
		queueResult([{ id: 'visit-1', status: 'waiting' }]);
		const submission = parseSubmission(
			selfSubmission({
				source: 'admin',
				admission: 'queue',
				lotteryWeight: 5,
			}),
		)!;

		await registerGuest(submission, { kind: 'guest' });

		// They already have a spot — weighting a draw they are not in would just be misleading data.
		expect(insertedVisit()?.lotteryWeight).toBe(1);
	});

	it('leaves a self-registration on even odds whatever the payload claims', async () => {
		queueResult([openEvent]);
		queueResult([]); // no registration questions
		queueResult([openEvent]); // locked event eligibility recheck
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]);
		queueResult([{ id: 'visit-1', status: 'registered' }]);
		const submission = parseSubmission(selfSubmission({ lotteryWeight: 99 }))!;

		await registerGuest(submission, { kind: 'guest' });

		// The weight is a worker's judgement call; a guest cannot award it to themselves.
		expect(insertedVisit()?.lotteryWeight).toBe(1);
	});

	it('records a guest served out of band once the session has ended', async () => {
		queueResult([{ status: 'ended' }]); // admin event status check
		queueResult([{ status: 'ended' }]); // locked event eligibility recheck
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]); // insert guests
		queueResult([{ id: 'visit-1', status: 'served' }]); // insert visits
		const submission = parseSubmission(selfSubmission({ source: 'admin', admission: 'served' }))!;

		const result = await registerGuest(submission, { kind: 'guest' });

		expect(result).toMatchObject({
			ok: true,
			status: 201,
			body: { status: 'served' },
		});
		// A record of someone already fed never joins a line.
		expect(insertedVisit()?.queuePosition ?? null).toBeNull();
	});

	it('puts a walk-in at the front of the queue when the worker asks for next up', async () => {
		queueResult([{ status: 'service_started' }]);
		queueResult([{ status: 'service_started' }]); // locked event eligibility recheck
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]);
		queueResult([{ id: 'event-1' }]); // placeInLine — the session lock
		queueResult([
			{
				highestNumber: 6,
				highestPriorityNumber: null,
				highestOrder: 6,
				othersWaiting: 4,
			},
		]); // the line so far
		queueResult([{ id: 'visit-1', status: 'waiting' }]);
		const submission = parseSubmission(
			selfSubmission({ source: 'admin', queuePlacement: 'next' }),
		)!;

		expect(submission.queuePlacement).toBe('next');
		await registerGuest(submission, { kind: 'guest' });

		// A priority number of its own, so nobody already waiting is renumbered.
		expect(insertedVisit()).toMatchObject({
			priorityNumber: 1,
			queueFront: true,
			queueOrder: 7,
		});
		expect(insertedVisit()?.queuePosition).toBeNull();
	});

	it('gives a walk-in put at the front a main number when nobody is waiting', async () => {
		queueResult([{ status: 'service_started' }]);
		queueResult([{ status: 'service_started' }]); // locked event eligibility recheck
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]);
		queueResult([{ id: 'event-1' }]); // placeInLine — the session lock
		queueResult([
			{
				highestNumber: 6,
				highestPriorityNumber: null,
				highestOrder: 6,
				othersWaiting: 0,
			},
		]);
		queueResult([{ id: 'visit-1', status: 'waiting' }]);
		const submission = parseSubmission(
			selfSubmission({ source: 'admin', queuePlacement: 'next' }),
		)!;

		await registerGuest(submission, { kind: 'guest' });

		expect(insertedVisit()).toMatchObject({
			queuePosition: 7,
			priorityNumber: null,
		});
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

describe('parseGuestInformation', () => {
	it('parses a valid sign-up with no device token', () => {
		expect(parseGuestInformation(signupSubmission())).toEqual({
			firstName: 'Ari',
			lastName: 'Guest',
			phone: '555-123-4567',
			locale: 'en',
			deviceToken: null,
		});
	});

	it('accepts a saved device token', () => {
		expect(
			parseGuestInformation(signupSubmission({ deviceToken: savedDeviceToken })),
		).toMatchObject({
			deviceToken: savedDeviceToken,
		});
	});

	it('rejects a malformed device token', () => {
		expect(parseGuestInformation(signupSubmission({ deviceToken: 'too-short' }))).toBeNull();
	});

	it('rejects a missing phone number', () => {
		expect(parseGuestInformation(signupSubmission({ phone: '' }))).toBeNull();
	});

	it('rejects an unsupported locale', () => {
		expect(parseGuestInformation(signupSubmission({ locale: 'de' }))).toBeNull();
	});

	it('rejects a missing first or last name', () => {
		expect(parseGuestInformation(signupSubmission({ firstName: '' }))).toBeNull();
		expect(parseGuestInformation(signupSubmission({ lastName: '' }))).toBeNull();
	});

	it('rejects a first or last name given only as initials', () => {
		expect(parseGuestInformation(signupSubmission({ firstName: 'A.' }))).toBeNull();
		expect(parseGuestInformation(signupSubmission({ lastName: 'G' }))).toBeNull();
	});

	it('rejects a non-object payload', () => {
		expect(parseGuestInformation('not an object')).toBeNull();
		expect(parseGuestInformation(null)).toBeNull();
	});
});

describe('saveGuestInformation', () => {
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

		const result = await saveGuestInformation(parseGuestInformation(signupSubmission())!);

		expect(result.ok).toBe(true);
		expect(result).toMatchObject({
			status: 201,
			body: { guestId: 'guest-1' },
		});

		if (!result.ok) {
			throw new Error('Expected sign-up to succeed');
		}
		expect(result.body.deviceToken).toBeTruthy();
		expect(insertedGuest()?.deviceTokenHash).toBeTruthy();
		expect(db.update).not.toHaveBeenCalled();
	});

	it('never touches visits for a sign-up', async () => {
		queueResult([{ id: 'guest-1' }]); // insert guests

		await saveGuestInformation(parseGuestInformation(signupSubmission())!);

		expect(db.select).not.toHaveBeenCalled();
	});

	it('updates only the identity fields for an already-identified device', async () => {
		queueResult([{ id: 'guest-1', firstName: 'Old' }]); // device credential lookup
		queueResult([{ id: 'guest-1', firstName: 'Renewed' }]); // tx.update guest returning

		const result = await saveGuestInformation(
			parseGuestInformation(
				signupSubmission({
					deviceToken: savedDeviceToken,
					firstName: 'Renewed',
				}),
			)!,
		);

		expect(result).toMatchObject({
			ok: true,
			status: 200,
			body: { guestId: 'guest-1' },
		});

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

		const result = await saveGuestInformation(
			parseGuestInformation(signupSubmission({ deviceToken: savedDeviceToken }))!,
		);

		expect(result).toMatchObject({
			ok: true,
			status: 201,
			body: { guestId: 'guest-2' },
		});

		if (!result.ok) {
			throw new Error('Expected sign-up to succeed');
		}
		expect(result.body.deviceToken).toBeTruthy();
		expect(result.body.deviceToken).not.toBe(savedDeviceToken);
	});
});

/** The kinds of every history entry recorded. */
function recordedKinds() {
	return vi
		.mocked(recordVisitEvents)
		.mock.calls.flatMap(([, events]) => events.map((event) => event.kind));
}

describe('registerGuest for the premarket', () => {
	// Registration opens at 9:00 Pacific on 18 July; the premarket is open all that day.
	const marketDay = {
		id: 'event-1',
		locationId: 'location-1',
		status: 'scheduled',
		registrationOpensAt: new Date('2026-07-18T16:00:00.000Z'),
		registrationClosesAt: new Date('2026-07-18T17:00:00.000Z'),
	};
	const location = { id: 'location-1', name: 'Bay Point', timeZone: 'America/Los_Angeles' };

	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-07-18T15:00:00.000Z')); // 8:00 on market day
		vi.mocked(recordVisitEvents).mockClear();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	function setRows() {
		return db.update.mock.results
			.map(({ value }) => value as { set: ReturnType<typeof vi.fn> })
			.flatMap(({ set }) => set.mock.calls.map(([row]) => row));
	}

	function insertedVisit() {
		return db.insert.mock.results
			.map(({ value }) => value as { values: ReturnType<typeof vi.fn> })
			.flatMap(({ values }) => values.mock.calls.map(([row]) => row))
			.find((row) => row?.guestId);
	}

	it('records a new volunteer as served in the premarket, with no number', async () => {
		// Arrange
		queueResult([marketDay]);
		queueResult([location]);
		queueResult([marketDay]); // locked event eligibility recheck
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]); // insert guests
		queueResult([{ id: 'visit-1', status: 'served' }]); // insert visits
		const submission = parseSubmission(selfSubmission())!;

		// Act
		const result = await registerGuest(submission, { kind: 'guest' }, { premarket: true });

		// Assert
		expect(result).toMatchObject({ ok: true, status: 201, body: { status: 'served' } });
		expect(insertedVisit()).toMatchObject({
			status: 'served',
			track: 'premarket',
			lotteryWeight: 1,
			servedAt: new Date('2026-07-18T15:00:00.000Z'),
		});
		expect(insertedVisit()?.queuePosition ?? null).toBeNull();
		expect(recordedKinds()).toEqual(['premarket_check_in']);
	});

	it.each(['registered', 'cancelled', 'waiting', 'called', 'not_placed', 'no_show'] as const)(
		'moves a guest’s own %s visit to the premarket rather than adding a second',
		async (status) => {
			// Arrange
			queueResult([marketDay]);
			queueResult([location]);
			queueResult([{ id: 'guest-1', firstName: 'Ari' }]); // device credential lookup
			queueResult([{ id: 'visit-1', status }]); // existing visit lookup
			queueResult([marketDay]); // locked event eligibility recheck
			queueResult([{ id: 'guest-1', firstName: 'Ari' }]); // tx.update guest returning
			queueResult([{ id: 'visit-1', status: 'served' }]); // tx.update visits returning
			const submission = parseSubmission(selfSubmission({ deviceToken: savedDeviceToken }))!;

			// Act
			const result = await registerGuest(submission, { kind: 'guest' }, { premarket: true });

			// Assert
			expect(result).toMatchObject({ ok: true, status: 200, body: { status: 'served' } });
			expect(db.insert).not.toHaveBeenCalled();
			expect(setRows().find((row) => row?.accessTokenHash)).toMatchObject({
				track: 'premarket',
				status: 'served',
				queuePosition: null,
				priorityNumber: null,
				// A standby guest checking in for the premarket gives up their S number.
				standbyNumber: null,
				queueFront: false,
				queueOrder: null,
				lotteryWeight: 1,
			});
			expect(recordedKinds()).toEqual(['premarket_check_in']);
		},
	);

	it('leaves a premarket visit in the premarket when its guest registers for the lottery', async () => {
		// Arrange
		const openEvent = { ...marketDay, status: 'registration_open' };

		vi.setSystemTime(new Date('2026-07-18T16:30:00.000Z'));
		queueResult([openEvent]);
		queueResult([]); // no registration questions
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]); // device credential lookup
		queueResult([{ id: 'visit-1', status: 'served' }]); // existing premarket visit
		queueResult([openEvent]); // locked event eligibility recheck
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]); // tx.update guest returning
		queueResult([{ id: 'visit-1', status: 'served' }]); // tx.update visits returning
		const submission = parseSubmission(selfSubmission({ deviceToken: savedDeviceToken }))!;

		// Act
		const result = await registerGuest(submission, { kind: 'guest' });

		// Assert
		expect(result).toMatchObject({ ok: true, body: { status: 'served' } });
		const visitUpdate = setRows().find((row) => row?.accessTokenHash);

		expect(visitUpdate).toMatchObject({ status: 'served' });
		expect(visitUpdate).not.toHaveProperty('track');
	});

	it('puts a removed volunteer who enters the lottery back on the lottery’s track', async () => {
		// Arrange
		const openEvent = { ...marketDay, status: 'registration_open' };

		vi.setSystemTime(new Date('2026-07-18T16:30:00.000Z'));
		queueResult([openEvent]);
		queueResult([]); // no registration questions
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]); // device credential lookup
		queueResult([{ id: 'visit-1', status: 'cancelled' }]); // a removed premarket visit
		queueResult([openEvent]); // locked event eligibility recheck
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]); // tx.update guest returning
		queueResult([{ id: 'visit-1', status: 'registered' }]); // tx.update visits returning
		const submission = parseSubmission(selfSubmission({ deviceToken: savedDeviceToken }))!;

		// Act
		await registerGuest(submission, { kind: 'guest' });

		// Assert
		expect(setRows().find((row) => row?.accessTokenHash)).toMatchObject({
			status: 'registered',
			track: 'lottery',
		});
	});

	it('refuses the premarket the day before the market', async () => {
		// Arrange
		vi.setSystemTime(new Date('2026-07-17T18:00:00.000Z'));
		queueResult([marketDay]);
		queueResult([location]);
		const submission = parseSubmission(selfSubmission())!;

		// Act
		const result = await registerGuest(submission, { kind: 'guest' }, { premarket: true });

		// Assert
		expect(result).toEqual({ ok: false, status: 409, error: 'The premarket is not open.' });
	});

	it('records a volunteer after the draw, while guests shop', async () => {
		// Arrange
		const serving = { ...marketDay, status: 'service_started' };

		vi.setSystemTime(new Date('2026-07-18T18:00:00.000Z'));
		queueResult([serving]);
		queueResult([location]);
		queueResult([serving]); // locked event eligibility recheck
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]); // insert guests
		queueResult([{ id: 'visit-1', status: 'served' }]); // insert visits
		const submission = parseSubmission(selfSubmission())!;

		// Act
		const result = await registerGuest(submission, { kind: 'guest' }, { premarket: true });

		// Assert
		expect(result).toMatchObject({ ok: true, status: 201 });
		expect(insertedVisit()).toMatchObject({ status: 'served', track: 'premarket' });
		expect(recordedKinds()).toEqual(['premarket_check_in']);
	});

	it('refuses the premarket once the session has ended', async () => {
		// Arrange
		const ended = { ...marketDay, status: 'ended' };

		queueResult([ended]);
		queueResult([location]);
		const submission = parseSubmission(selfSubmission())!;

		// Act
		const result = await registerGuest(submission, { kind: 'guest' }, { premarket: true });

		// Assert
		expect(result).toEqual({ ok: false, status: 409, error: 'The premarket is not open.' });
	});

	it('lets a worker add a premarket volunteer, recorded as served with no number', async () => {
		// Arrange
		queueResult([{ status: 'registration_open' }]); // admin event status check
		queueResult([{ status: 'registration_open' }]); // locked event eligibility recheck
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]); // insert guests
		queueResult([{ id: 'visit-1', status: 'served' }]); // insert visits
		const submission = parseSubmission(
			selfSubmission({ source: 'admin', admission: 'premarket', lotteryWeight: 5 }),
		)!;

		// Act
		const result = await registerGuest(submission, { kind: 'guest' });

		// Assert
		expect(result).toMatchObject({ ok: true, status: 201, body: { status: 'served' } });
		expect(insertedVisit()).toMatchObject({
			track: 'premarket',
			status: 'served',
			lotteryWeight: 1,
		});
		expect(insertedVisit()?.queuePosition ?? null).toBeNull();
		expect(recordedKinds()).toEqual(['premarket_check_in']);
	});
});

describe('registerGuest onto standby', () => {
	/** The row handed to `insert(visits).values(...)`, dug out of the stubbed insert calls. */
	function insertedVisit() {
		return db.insert.mock.results
			.map(({ value }) => value as { values: ReturnType<typeof vi.fn> })
			.flatMap(({ values }) => values.mock.calls.map(([row]) => row))
			.find((row) => row?.guestId);
	}

	it('lets a worker put a guest on standby with the next S number', async () => {
		// Arrange
		queueResult([{ status: 'service_started' }]); // admin event status check
		queueResult([{ status: 'service_started' }]); // locked event eligibility recheck
		queueResult([{ id: 'guest-1', firstName: 'Ari' }]); // insert guests
		queueResult([{ id: 'event-1' }]); // session lock for the S number
		queueResult([{ highest: 4 }]); // the session's highest S number
		queueResult([{ id: 'visit-1', status: 'waiting' }]); // insert visits
		const submission = parseSubmission(
			selfSubmission({ source: 'admin', admission: 'standby', lotteryWeight: 5 }),
		)!;

		// Act
		const result = await registerGuest(submission, { kind: 'guest' });

		// Assert
		expect(result).toMatchObject({ ok: true, status: 201, body: { status: 'waiting' } });
		expect(insertedVisit()).toMatchObject({
			track: 'postmarket',
			status: 'waiting',
			standbyNumber: 5,
			queuePosition: null,
			priorityNumber: null,
			lotteryWeight: 1,
		});
		expect(vi.mocked(recordVisitEvents).mock.calls.at(-1)![1]).toEqual([
			expect.objectContaining({ kind: 'added', details: { standbyNumber: 5 } }),
		]);
	});

	it('refuses standby before the draw has run', async () => {
		// Arrange
		queueResult([{ status: 'lottery_pending' }]); // admin event status check
		const submission = parseSubmission(selfSubmission({ source: 'admin', admission: 'standby' }))!;

		// Act
		const result = await registerGuest(submission, { kind: 'guest' });

		// Assert
		expect(result.ok).toBe(false);
		expect(db.insert).not.toHaveBeenCalled();
	});
});
