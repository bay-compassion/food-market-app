import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../test/dbStub.mjs';
import { hashDeviceToken, hashVisitToken } from './guestCredentials.mjs';

vi.mock('../../db/index.mjs', () => ({ db }));

import { demoDataToolsEnabled, loadScenario } from './demoScenario.mjs';

afterEach(() => {
	resetDbStub();
	delete process.env.ENABLE_DEMO_DATA_TOOLS;
});

describe('demoDataToolsEnabled', () => {
	it('is off unless explicitly enabled', () => {
		expect(demoDataToolsEnabled()).toBe(false);
	});

	it('reads ENABLE_DEMO_DATA_TOOLS=true, case- and whitespace-insensitively', () => {
		process.env.ENABLE_DEMO_DATA_TOOLS = ' TRUE ';
		expect(demoDataToolsEnabled()).toBe(true);
	});

	it('stays off for anything other than "true"', () => {
		process.env.ENABLE_DEMO_DATA_TOOLS = '1';
		expect(demoDataToolsEnabled()).toBe(false);
	});
});

describe('loadScenario', () => {
	it('archives a stale session and inserts the new one, with guests and visits', async () => {
		queueResult([{ id: 'stale-event' }]); // the select for a non-ended session
		queueResult([{ id: 'visit-1' }]); // resolveOutstandingVisits' update...returning
		queueResult(undefined); // archiving the stale session
		queueResult(undefined); // insert guests
		queueResult(undefined); // insert marketEvents
		queueResult(undefined); // insert registrationQuestions
		queueResult(undefined); // insert visits

		const result = await loadScenario({ stage: 'registration_closed' });

		expect(result.marketEventId).toEqual(expect.any(String));
		expect(db.transaction).toHaveBeenCalledOnce();
		const guestValues = db.insert.mock.results[0]!.value.values as ReturnType<typeof vi.fn>;
		const visitValues = db.insert.mock.results[3]!.value.values as ReturnType<typeof vi.fn>;
		const insertedGuests = guestValues.mock.calls[0]![0] as Array<{
			id: string;
			deviceTokenHash: string;
		}>;
		const insertedVisits = visitValues.mock.calls[0]![0] as Array<{
			id: string;
			accessTokenHash: string;
		}>;

		expect(result.guests).toHaveLength(34);

		for (const guest of result.guests) {
			expect(insertedGuests.find((entry) => entry.id === guest.id)?.deviceTokenHash).toBe(
				hashDeviceToken(guest.deviceToken),
			);

			if (guest.visit) {
				expect(insertedVisits.find((entry) => entry.id === guest.visit!.id)?.accessTokenHash).toBe(
					hashVisitToken(guest.visit.token),
				);
			}
		}
		expect(JSON.stringify(insertedGuests)).not.toContain(result.guests[0]!.deviceToken);
		expect(db.update).toHaveBeenCalledTimes(2); // resolveOutstandingVisits, then archiving
		expect(db.insert).toHaveBeenCalledTimes(4); // guests, marketEvents, registrationQuestions, visits
	});

	it('skips archiving and the guest/visit inserts when there is nothing to insert', async () => {
		queueResult([]); // no stale session
		queueResult(undefined); // insert marketEvents
		queueResult(undefined); // insert registrationQuestions

		const result = await loadScenario({ stage: 'draft' });

		expect(result).toEqual({ marketEventId: expect.any(String), guests: [] });
		expect(db.update).not.toHaveBeenCalled();
		expect(db.insert).toHaveBeenCalledTimes(2); // marketEvents, registrationQuestions — no guests/visits
	});
});
