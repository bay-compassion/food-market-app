import { afterEach, describe, expect, it, vi } from 'vitest';

import { StandbyCode } from './standby-code.mjs';

const secret = 'a-test-secret-that-is-long-enough-to-use';

afterEach(() => {
	vi.unstubAllEnvs();
});

describe('StandbyCode', () => {
	it('reads back the session a code was made for', () => {
		// Arrange
		const codes = new StandbyCode(secret);

		// Act
		const session = codes.sessionOf(codes.codeFor('event-1'));

		// Assert
		expect(session).toBe('event-1');
	});

	it('refuses a code signed for another session, or by another secret', () => {
		// Arrange
		const codes = new StandbyCode(secret);
		const [, signature] = codes.codeFor('event-1').split('.');

		// Act
		const swapped = codes.sessionOf(`event-2.${signature}`);
		const foreign = codes.sessionOf(new StandbyCode(`${secret}-other`).codeFor('event-1'));

		// Assert
		expect(swapped).toBeNull();
		expect(foreign).toBeNull();
	});

	it('refuses anything that isn’t shaped like a code', () => {
		// Arrange
		const codes = new StandbyCode(secret);

		// Act
		const read = ['', 'event-1', 'event-1.', 'a.b.c'].map((code) => codes.sessionOf(code));

		// Assert
		expect(read).toEqual([null, null, null, null]);
	});

	it('makes no codes without the kiosk secret', () => {
		// Arrange
		vi.stubEnv('KIOSK_SECRET', '');

		// Act
		const codes = StandbyCode.fromEnvironment();

		// Assert
		expect(codes).toBeNull();
	});
});
