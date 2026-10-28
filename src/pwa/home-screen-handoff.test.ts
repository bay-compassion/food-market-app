import { beforeEach, describe, expect, it } from 'vitest';

import { StorageKey } from '../services/storage.service';
import { HomeScreenHandoff } from './home-screen-handoff';

const visitKey = 'bay-compassion.visit-token';
const now = 100_000;

function seedGuest() {
	localStorage.setItem(StorageKey.GUEST_DEVICE_TOKEN, JSON.stringify('device-token'));
	localStorage.setItem(
		StorageKey.GUEST_IDENTITY,
		JSON.stringify({ firstName: 'مریم', lastName: 'Guest', phone: '5551234567' }),
	);
	localStorage.setItem(visitKey, 'visit-token');
	localStorage.setItem(StorageKey.LOCALE, 'fa');
}

beforeEach(() => localStorage.clear());

describe('HomeScreenHandoff', () => {
	it('carries guest credentials and Unicode identity into fresh storage, then clears the copy', () => {
		// Arrange
		seedGuest();
		localStorage.setItem('unrelated-secret', 'not-for-installation');
		const document = { cookie: '' };
		const handoff = new HomeScreenHandoff(localStorage, document, true, () => now);
		const identity = localStorage.getItem(StorageKey.GUEST_IDENTITY);

		// Act
		expect(handoff.prepare()).toBe(true);
		expect(document.cookie).toContain('Path=/pwa-start; Max-Age=3600; SameSite=Strict; Secure');
		localStorage.clear();
		handoff.restore();

		// Assert
		expect(localStorage.getItem(StorageKey.GUEST_IDENTITY)).toBe(identity);
		expect(localStorage.getItem(StorageKey.GUEST_DEVICE_TOKEN)).toBe(
			JSON.stringify('device-token'),
		);
		expect(localStorage.getItem(visitKey)).toBe('visit-token');
		expect(localStorage.getItem(StorageKey.LOCALE)).toBe('fa');
		expect(localStorage.getItem('unrelated-secret')).toBeNull();
		expect(document.cookie).toContain('Max-Age=0');
	});

	it.each([StorageKey.GUEST_DEVICE_TOKEN, StorageKey.GUEST_IDENTITY, visitKey])(
		'never replaces existing data when %s is already saved',
		(key) => {
			// Arrange
			seedGuest();
			const document = { cookie: '' };
			const handoff = new HomeScreenHandoff(localStorage, document, true, () => now);

			handoff.prepare();
			localStorage.clear();
			localStorage.setItem(key, 'newer-guest-or-visit');

			// Act
			handoff.restore();

			// Assert
			expect(localStorage.getItem(key)).toBe('newer-guest-or-visit');
			expect(localStorage.length).toBe(1);
		},
	);

	it.each([
		'broken-json',
		encodeURIComponent(
			JSON.stringify({
				expiresAt: now - 1,
				values: { [visitKey]: 'old', [StorageKey.GUEST_DEVICE_TOKEN]: 'old' },
			}),
		),
		encodeURIComponent(JSON.stringify({ expiresAt: now + 1, values: { [visitKey]: 4 } })),
	])('ignores malformed or expired snapshots', (value) => {
		// Arrange
		const document = { cookie: `bay-compassion.pwa-handoff=${value}` };
		const handoff = new HomeScreenHandoff(localStorage, document, true, () => now);

		// Act
		handoff.restore();

		// Assert
		expect(localStorage.length).toBe(0);
		expect(document.cookie).toContain('Max-Age=0');
	});

	it('refuses an oversized snapshot rather than relying on a browser to truncate it', () => {
		// Arrange
		seedGuest();
		localStorage.setItem(StorageKey.GUEST_IDENTITY, 'x'.repeat(4000));
		const document = { cookie: '' };

		// Act
		const prepared = new HomeScreenHandoff(localStorage, document).prepare();

		// Assert
		expect(prepared).toBe(false);
		expect(document.cookie).toBe('');
	});

	it('rolls back a partial restore when browser storage fills up', () => {
		// Arrange
		seedGuest();
		const document = { cookie: '' };

		new HomeScreenHandoff(localStorage, document, true, () => now).prepare();
		localStorage.clear();
		localStorage.setItem(StorageKey.LOCALE, 'es');
		const storage = {
			getItem: (key: string) => localStorage.getItem(key),
			removeItem: (key: string) => localStorage.removeItem(key),
			setItem: (key: string, value: string) => {
				if (key === visitKey) {
					throw new Error('quota');
				}
				localStorage.setItem(key, value);
			},
		};

		// Act
		new HomeScreenHandoff(storage, document, true, () => now).restore();

		// Assert
		expect(localStorage.getItem(StorageKey.GUEST_DEVICE_TOKEN)).toBeNull();
		expect(localStorage.getItem(StorageKey.GUEST_IDENTITY)).toBeNull();
		expect(localStorage.getItem(StorageKey.LOCALE)).toBe('es');
	});

	it('does not crash startup when cookies are blocked', () => {
		// Arrange
		const document = {
			get cookie(): string {
				throw new Error('blocked');
			},
			set cookie(_value: string) {
				throw new Error('blocked');
			},
		};
		const handoff = new HomeScreenHandoff(localStorage, document);

		// Act / Assert
		expect(() => handoff.restore()).not.toThrow();
		expect(() => handoff.clear()).not.toThrow();
	});
});
