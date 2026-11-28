import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../test/dbStub.mjs';

vi.mock('../../db/index.mjs', () => ({ db }));

import { StandbyCode } from './standby-code.mjs';
import { issueStandbyTicket } from './standby.mjs';

const secret = 'a-test-secret-that-is-long-enough-to-use';
const code = new StandbyCode(secret).codeFor('event-1');

/** The row handed to `insert(standbyTickets).values(...)`. */
function insertedTicket() {
	const chain = db.insert.mock.results[0]?.value as { values: ReturnType<typeof vi.fn> };

	return chain.values.mock.calls[0]![0];
}

afterEach(() => {
	resetDbStub();
	vi.unstubAllEnvs();
});

describe('issueStandbyTicket', () => {
	it('holds the next S number for a guest who scanned once standby has opened', async () => {
		// Arrange
		vi.stubEnv('KIOSK_SECRET', secret);
		queueResult([{ status: 'service_started' }]); // the session, locked
		queueResult([{ status: 'service_started', called: true }]); // standby has opened
		queueResult([{ id: 'event-1' }]); // the session lock for the S number
		queueResult([{ highest: 6 }]); // the highest S number given or held
		queueResult(undefined); // the ticket inserted

		// Act
		const result = await issueStandbyTicket(code);

		// Assert
		expect(result).toEqual({
			ok: true,
			ticket: expect.any(String),
			standbyNumber: 7,
			marketEventId: 'event-1',
		});
		expect(insertedTicket()).toEqual({
			marketEventId: 'event-1',
			tokenHash: expect.stringMatching(/^[0-9a-f]{64}$/),
			standbyNumber: 7,
		});
	});

	it('refuses before the first number has been called', async () => {
		// Arrange
		vi.stubEnv('KIOSK_SECRET', secret);
		queueResult([{ status: 'service_started' }]);
		queueResult([{ status: 'service_started', called: false }]);

		// Act
		const result = await issueStandbyTicket(code);

		// Assert
		expect(result).toEqual({ ok: false, status: 409, error: 'Standby isn’t open yet.' });
		expect(db.insert).not.toHaveBeenCalled();
	});

	it('refuses once the session has ended', async () => {
		// Arrange
		vi.stubEnv('KIOSK_SECRET', secret);
		queueResult([{ status: 'ended' }]);

		// Act
		const result = await issueStandbyTicket(code);

		// Assert
		expect(result).toMatchObject({ ok: false, status: 410 });
	});

	it('refuses a code this server never signed, without reading the database', async () => {
		// Arrange
		vi.stubEnv('KIOSK_SECRET', secret);

		// Act
		const result = await issueStandbyTicket('event-1.not-a-real-signature-at-all');

		// Assert
		expect(result).toMatchObject({ ok: false, status: 404 });
		expect(db.transaction).not.toHaveBeenCalled();
	});
});
