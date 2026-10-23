// @vitest-environment node
// jose checks `instanceof Uint8Array`, which a jsdom realm's buffers fail.

import { afterEach, describe, expect, it, vi } from 'vitest';

import { KioskAccess } from './kiosk-access.mjs';

const secret = 'a-test-secret-that-is-long-enough-to-use';
const windowMs = KioskAccess.codeWindowSeconds * 1000;
/** The start of a code window, so a test can step exactly across its edges. */
const windowStart = 1_000_000 * windowMs;

function accessAt(time: number, key = secret) {
	return new KioskAccess(key, () => time);
}

afterEach(() => {
	vi.unstubAllEnvs();
});

describe('KioskAccess', () => {
	it('issues a six-digit code that lapses at the end of the following window', () => {
		// Act
		const { code, expiresAt } = accessAt(windowStart + 1_000).issueCode();

		// Assert
		expect(code).toMatch(/^\d{6}$/);
		expect(expiresAt).toBe(new Date(windowStart + 2 * windowMs).toISOString());
	});

	it('trades a code for a token the same secret accepts', async () => {
		// Arrange
		const access = accessAt(windowStart);
		const { code } = access.issueCode();

		// Act
		const token = await access.exchange(code);

		// Assert
		expect(token).not.toBeNull();
		await expect(access.verify(token!)).resolves.toBe(true);
	});

	it('still accepts a code in the window after it was issued', async () => {
		// Arrange
		const { code } = accessAt(windowStart).issueCode();

		// Act
		const token = await accessAt(windowStart + 2 * windowMs - 1).exchange(code);

		// Assert
		expect(token).not.toBeNull();
	});

	it('refuses a code two windows old', async () => {
		// Arrange
		const { code } = accessAt(windowStart).issueCode();

		// Act
		const token = await accessAt(windowStart + 2 * windowMs).exchange(code);

		// Assert
		expect(token).toBeNull();
	});

	it('refuses a wrong code', async () => {
		// Arrange
		const access = accessAt(windowStart);
		const wrong = access.issueCode().code === '000000' ? '000001' : '000000';

		// Act
		const token = await access.exchange(wrong);

		// Assert
		expect(token).toBeNull();
	});

	it('refuses a token once the secret is rotated', async () => {
		// Arrange
		const access = accessAt(windowStart);
		const token = (await access.exchange(access.issueCode().code))!;

		// Act
		const valid = await accessAt(windowStart, `${secret}-rotated`).verify(token);

		// Assert
		expect(valid).toBe(false);
	});

	it('refuses a token past its lifetime', async () => {
		// Arrange
		const access = accessAt(windowStart);
		const token = (await access.exchange(access.issueCode().code))!;
		const later = windowStart + 181 * 24 * 60 * 60 * 1000;

		// Act
		const valid = await accessAt(later).verify(token);

		// Assert
		expect(valid).toBe(false);
	});

	it('refuses to start without a long enough secret', () => {
		// Arrange
		vi.stubEnv('KIOSK_SECRET', 'short');

		// Act & Assert
		expect(() => KioskAccess.fromEnvironment()).toThrow(/KIOSK_SECRET/);
	});
});
