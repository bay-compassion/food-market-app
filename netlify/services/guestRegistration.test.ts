import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../test/dbStub.js';

vi.mock('../../db/index.js', () => ({ db }));
vi.mock('./guestCredentials.js', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./guestCredentials.js')>();

	return { ...actual, authenticateGuest: vi.fn() };
});

import { authenticateGuest } from './guestCredentials.js';
import { parseSubmission, registerGuest } from './guestRegistration.js';

afterEach(() => {
	resetDbStub();
	vi.mocked(authenticateGuest).mockReset();
});

function selfSubmission(overrides: Record<string, unknown> = {}) {
	return {
		firstName: 'Ari',
		lastName: 'Guest',
		age: 30,
		householdSize: 2,
		phone: '555-123-4567',
		locale: 'en',
		pin: '1234',
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
			registrationType: 'new',
			locale: 'en',
			marketEventId: 'event-1',
		});
	});

	it('parses a returning guest submission without profile fields', () => {
		const result = parseSubmission({
			phone: '555-123-4567',
			locale: 'en',
			pin: '1234',
			registrationType: 'returning',
			marketEventId: 'event-1',
		});

		expect(result).toMatchObject({ registrationType: 'returning', firstName: '', lastName: '' });
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

	it('rejects an invalid PIN for a self-service submission', () => {
		expect(parseSubmission(selfSubmission({ pin: 'ab' }))).toBeNull();
	});

	it('does not require a PIN for an admin submission', () => {
		const result = parseSubmission(selfSubmission({ source: 'admin', pin: '' }));

		expect(result?.source).toBe('admin');
	});

	it('rejects non-string/number answer values', () => {
		expect(parseSubmission(selfSubmission({ answers: { q1: { nested: true } } }))).toBeNull();
	});

	it('rejects an out-of-range age when a profile is required', () => {
		expect(parseSubmission(selfSubmission({ age: 200 }))).toBeNull();
	});

	it('rejects an out-of-range household size when a profile is required', () => {
		expect(parseSubmission(selfSubmission({ householdSize: 0 }))).toBeNull();
	});

	it('requires profile fields when updateProfile is set on a returning guest', () => {
		const result = parseSubmission({
			phone: '555-123-4567',
			locale: 'en',
			pin: '1234',
			registrationType: 'returning',
			updateProfile: true,
			marketEventId: 'event-1',
		});

		expect(result).toBeNull();
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

	it('rejects a self submission when the session is not open for registration', async () => {
		queueResult([
			{
				id: 'event-1',
				status: 'draft',
				sessionMode: 'scheduled',
				registrationOpensAt: new Date(Date.now() + 60_000),
				registrationClosesAt: new Date(Date.now() + 120_000),
			},
		]);
		const submission = parseSubmission(selfSubmission())!;

		const result = await registerGuest(submission);

		expect(result).toEqual({ ok: false, status: 409, error: 'Registration is not open.' });
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

	it('rejects a returning guest whose phone/PIN cannot be verified', async () => {
		queueResult([
			{
				id: 'event-1',
				status: 'registration_open',
				sessionMode: 'scheduled',
				registrationOpensAt: new Date(Date.now() - 60_000),
				registrationClosesAt: new Date(Date.now() + 60_000),
			},
		]);
		queueResult([]);
		vi.mocked(authenticateGuest).mockResolvedValueOnce(null);
		const submission = parseSubmission(selfSubmission({ registrationType: 'returning' }))!;

		const result = await registerGuest(submission);

		expect(result).toEqual({
			ok: false,
			status: 401,
			error: 'The phone number or PIN could not be verified.',
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
	});

	it('updates the existing visit for a returning guest', async () => {
		queueResult([openEvent]);
		queueResult([]); // no registration questions
		queueResult([{ id: 'visit-1', status: 'waiting' }]); // existing visit lookup
		queueResult([{ id: 'visit-1', status: 'waiting' }]); // tx.update visits returning
		vi.mocked(authenticateGuest).mockResolvedValueOnce({
			id: 'guest-1',
			firstName: 'Ari',
		} as never);
		const submission = parseSubmission(selfSubmission({ registrationType: 'returning' }))!;

		const result = await registerGuest(submission);

		expect(result).toMatchObject({
			ok: true,
			status: 200,
			body: { id: 'visit-1', guestId: 'guest-1', status: 'waiting' },
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
