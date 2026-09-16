import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../test/dbStub.mjs';
import { baseEvent } from '../test/marketEventFixture.mjs';

vi.mock('../../db/index.mjs', () => ({ db }));
vi.mock('./pushNotifications.mjs', () => ({ notificationsEnabled: vi.fn(() => true) }));
vi.mock('./notificationDispatch.mjs', () => ({ requestNotificationDispatch: vi.fn() }));
vi.mock('./marketLifecycleEvents.mjs', () => ({ scheduleRegistrationClose: vi.fn() }));

import { notificationsEnabled } from './pushNotifications.mjs';
import { parseSettings, saveSettings } from './sessionSettings.mjs';

afterEach(() => {
	resetDbStub();
	vi.mocked(notificationsEnabled).mockReturnValue(true);
});

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

	it('keeps each question’s required flag, defaulting it to false', () => {
		const result = parseSettings(
			validBody({
				questions: [
					{ prompt: 'Required question', type: 'text', required: true },
					{ prompt: 'Optional question', type: 'scale' },
				],
			}),
		);

		expect(result?.questions).toEqual([
			{ prompt: 'Required question', type: 'text', required: true },
			{ prompt: 'Optional question', type: 'scale', required: false },
		]);
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
