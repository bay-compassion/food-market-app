import { describe, expect, it, vi } from 'vitest';

vi.mock('../../db/index.js', () => ({ db: {} }));
vi.mock('web-push', () => ({ default: {} }));

import { languages } from '../../src/locales.js';
import {
	deliveryCopy,
	notificationCopy,
	notificationsEnabled,
	notificationTypes,
	pushConfiguration,
} from './pushNotifications.mjs';

describe('push notification copy', () => {
	it('provides localized title and body text for every notification and locale', () => {
		for (const language of languages) {
			for (const type of notificationTypes) {
				const notification = notificationCopy(language.code, type);

				expect(notification.title).toBeTruthy();
				expect(notification.body).toBeTruthy();
			}
		}
	});

	it('keeps the selected and not-selected messages distinct', () => {
		expect(notificationCopy('en', 'lottery_selected')).not.toEqual(
			notificationCopy('en', 'lottery_not_selected'),
		);
	});

	it('uses the administrator-provided copy for a broadcast', () => {
		expect(
			deliveryCopy('es', 'broadcast', { title: 'Market update', body: 'Closing early' }),
		).toEqual({
			title: 'Market update',
			body: 'Closing early',
		});
	});
});

describe('push notification configuration', () => {
	it('disables notifications even when VAPID keys are configured', () => {
		vi.stubEnv('NOTIFICATIONS_ENABLED', 'false');
		vi.stubEnv('VAPID_PUBLIC_KEY', 'public-key');
		vi.stubEnv('VAPID_PRIVATE_KEY', 'private-key');
		vi.stubEnv('VAPID_SUBJECT', 'mailto:test@example.com');

		expect(notificationsEnabled()).toBe(false);
		expect(pushConfiguration()).toEqual({ configured: false, publicKey: null });

		vi.unstubAllEnvs();
	});
});
