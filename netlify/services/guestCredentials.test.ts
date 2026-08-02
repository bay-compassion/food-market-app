import { describe, expect, it, vi } from 'vitest';

vi.mock('../../db/index.js', () => ({ db: {} }));

import {
	hashPin,
	hashVisitToken,
	isValidPin,
	issueVisitToken,
	normalizePhone,
	verifyPin,
} from './guestCredentials';

describe('guest credentials', () => {
	it('normalizes North American phone numbers for matching', () => {
		expect(normalizePhone('(555) 123-4567')).toBe('+15551234567');
		expect(normalizePhone('+1 555 123 4567')).toBe('+15551234567');
	});

	it('accepts only PINs containing four to eight digits', () => {
		expect(isValidPin('1234')).toBe(true);
		expect(isValidPin('01012000')).toBe(true);
		expect(isValidPin('123')).toBe(false);
		expect(isValidPin('12ab')).toBe(false);
	});

	it('hashes and verifies a PIN without storing it directly', async () => {
		const hash = await hashPin('1234');

		expect(hash).not.toContain('1234');
		expect(await verifyPin('1234', hash)).toBe(true);
		expect(await verifyPin('4321', hash)).toBe(false);
	});

	it('issues a random visit token and a separate stored hash', () => {
		const first = issueVisitToken();
		const second = issueVisitToken();

		expect(first.token).not.toBe(first.tokenHash);
		expect(first.tokenHash).toBe(hashVisitToken(first.token));
		expect(second.token).not.toBe(first.token);
	});
});
