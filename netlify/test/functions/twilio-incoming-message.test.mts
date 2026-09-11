import twilio from 'twilio';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));

import handler from '../../routes/notifications/twilio-incoming-message.mjs';

const url = 'https://example.com/api/twilio/incoming-message';
const authToken = 'test-auth-token';
const baseParameters = {
	AccountSid: 'AC00000000000000000000000000000000',
	MessagingServiceSid: 'MG00000000000000000000000000000000',
	From: '+15551234567',
	To: '+15557654321',
	Body: 'STOP',
	OptOutType: 'STOP',
};

function request(
	parameters: Record<string, string> = baseParameters,
	signature = twilio.getExpectedTwilioSignature(authToken, url, parameters),
) {
	return new Request(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'X-Twilio-Signature': signature,
		},
		body: new URLSearchParams(parameters),
	});
}

beforeEach(() => {
	vi.stubEnv('TWILIO_ACCOUNT_SID', baseParameters.AccountSid);
	vi.stubEnv('TWILIO_AUTH_TOKEN', authToken);
	vi.stubEnv('TWILIO_MESSAGING_SERVICE_SID', baseParameters.MessagingServiceSid);
});

afterEach(() => {
	resetDbStub();
	vi.unstubAllEnvs();
});

describe('Twilio incoming-message webhook', () => {
	it('removes every matching guest subscription after STOP', async () => {
		queueResult([{ id: 'guest-1' }, { id: 'guest-2' }]);
		queueResult(undefined);
		queueResult(undefined);

		const response = await handler(request());

		expect(response.status).toBe(200);
		expect(db.delete).toHaveBeenCalledTimes(1);
		expect(db.insert).toHaveBeenCalledTimes(1);
		expect(db.transaction).toHaveBeenCalledTimes(1);
		expect(db.insert.mock.results[0]?.value.values).toHaveBeenCalledWith([
			{
				guestId: 'guest-1',
				senderPhone: baseParameters.To,
				optedOutAt: expect.any(Date),
			},
			{
				guestId: 'guest-2',
				senderPhone: baseParameters.To,
				optedOutAt: expect.any(Date),
			},
		]);
		await expect(response.text()).resolves.toContain('<Response/>');
	});

	it('restores every matching guest subscription after START', async () => {
		const parameters = { ...baseParameters, Body: 'START', OptOutType: 'START' };

		queueResult([{ id: 'guest-1' }, { id: 'guest-2' }]);
		queueResult(undefined);
		queueResult(undefined);

		const response = await handler(request(parameters));

		expect(response.status).toBe(200);
		expect(db.insert).toHaveBeenCalledTimes(1);
		expect(db.delete).toHaveBeenCalledTimes(1);
		expect(db.transaction).toHaveBeenCalledTimes(1);
	});

	it('accepts other incoming messages without changing consent', async () => {
		const parameters = { ...baseParameters, Body: 'HELP', OptOutType: 'HELP' };

		const response = await handler(request(parameters));

		expect(response.status).toBe(200);
		expect(db.select).not.toHaveBeenCalled();
		expect(db.delete).not.toHaveBeenCalled();
		expect(db.insert).not.toHaveBeenCalled();
	});

	it('rejects a request with an invalid Twilio signature', async () => {
		const response = await handler(request(baseParameters, 'not-valid'));

		expect(response.status).toBe(403);
		expect(db.select).not.toHaveBeenCalled();
	});

	it('rejects a validly signed event from another Messaging Service', async () => {
		const parameters = {
			...baseParameters,
			MessagingServiceSid: 'MG11111111111111111111111111111111',
		};

		const response = await handler(request(parameters));

		expect(response.status).toBe(403);
		expect(db.select).not.toHaveBeenCalled();
	});

	it('fails closed when Twilio credentials are unavailable', async () => {
		vi.stubEnv('TWILIO_AUTH_TOKEN', '');

		const response = await handler(request());

		expect(response.status).toBe(503);
		expect(db.select).not.toHaveBeenCalled();
	});
});
