import { afterEach, describe, expect, it, vi } from 'vitest';

import { BrowserInstallEnvironment } from './install-environment';

afterEach(() => vi.unstubAllGlobals());

describe('BrowserInstallEnvironment', () => {
	it.each([
		['iPhone OS 17_2 like Mac OS X) Version/17.2 Mobile/15E148 Safari/604.1', true],
		['iPhone OS 18_6 like Mac OS X) Version/18.6 Mobile/15E148 Safari/604.1', true],
		['iPhone OS 15_4 like Mac OS X) Version/15.4 Mobile/15E148 Safari/604.1', false],
		['iPhone OS 17_1 like Mac OS X) Version/17.1 Mobile/15E148 Safari/604.1', false],
		['iPhone OS 18_6 like Mac OS X) CriOS/123 Mobile/15E148 Safari/604.1', false],
		['iPhone OS 18_6 like Mac OS X) Mobile/15E148', false],
		['Macintosh; Intel Mac OS X 10_15) Version/18.6 Safari/605.1.15', false],
	])(
		'only offers iOS instructions where the saved visit can be carried over: %s',
		(userAgent, expected) => {
			// Arrange
			vi.stubGlobal('navigator', { userAgent, cookieEnabled: true });

			// Act
			const environment = new BrowserInstallEnvironment();

			// Assert
			expect(environment.canInstallOnIos).toBe(expected);
		},
	);

	it.each([
		['Mozilla/5.0 (Linux; Android 14; Pixel 7)', 'Linux armv8l', 5, 'android'],
		['Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X)', 'iPhone', 5, 'ios'],
		['Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X)', 'iPad', 5, 'ios'],
		['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 'MacIntel', 5, 'ios'],
		['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 'MacIntel', 0, 'other'],
		['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32', 0, 'other'],
	])(
		'classifies mobile platforms without treating desktop install support as Android: %s',
		(userAgent, platform, maxTouchPoints, expected) => {
			// Arrange
			vi.stubGlobal('navigator', { userAgent, platform, maxTouchPoints });

			// Act / Assert
			expect(new BrowserInstallEnvironment().platform).toBe(expected);
		},
	);

	it('recognizes an iOS standalone window even without matchMedia', () => {
		// Arrange
		vi.stubGlobal('navigator', { standalone: true });

		// Act / Assert
		expect(new BrowserInstallEnvironment().isStandalone).toBe(true);
	});
});
