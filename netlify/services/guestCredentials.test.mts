import { describe, expect, it, vi } from 'vitest';

vi.mock('../../db/index.mjs', () => ({ db: {} }));

import {
	hashDeviceToken,
	hashVisitToken,
	issueDeviceToken,
	issueVisitToken,
	normalizePhone,
} from './guestCredentials.mjs';

describe('guest credentials', () => {
	it('normalizes North American phone numbers for matching', () => {
		expect(normalizePhone('(555) 123-4567')).toBe('+15551234567');
		expect(normalizePhone('+1 555 123 4567')).toBe('+15551234567');
	});

	it('issues a random visit token and a separate stored hash', () => {
		const first = issueVisitToken();
		const second = issueVisitToken();

		expect(first.token).not.toBe(first.tokenHash);
		expect(first.tokenHash).toBe(hashVisitToken(first.token));
		expect(second.token).not.toBe(first.token);
	});

	it('issues a random device token and stores only its hash', () => {
		const credential = issueDeviceToken();

		expect(credential.token).not.toBe(credential.tokenHash);
		expect(credential.tokenHash).toBe(hashDeviceToken(credential.token));
	});
});
