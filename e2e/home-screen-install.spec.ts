import { expect, type Page, test } from '@playwright/test';

import {
	ANDROID_HOME_SCREEN_INSTALL_FLAG_KEY,
	IOS_HOME_SCREEN_INSTALL_FLAG_KEY,
} from '../src/components/hooks/use-home-screen-install-enabled';

const safari =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

async function marketApi(page: Page, flags = { android: true, ios: true }) {
	await page.route(/launchdarkly\.com/, (route) =>
		route.request().url().includes('/sdk/evalx/')
			? route.fulfill({
					json: {
						[ANDROID_HOME_SCREEN_INSTALL_FLAG_KEY]: {
							value: flags.android,
							variation: flags.android ? 0 : 1,
							version: 1,
						},
						[IOS_HOME_SCREEN_INSTALL_FLAG_KEY]: {
							value: flags.ios,
							variation: flags.ios ? 0 : 1,
							version: 1,
						},
					},
				})
			: route.abort(),
	);
	await page.route('**/api/**', (route) => {
		const path = new URL(route.request().url()).pathname;

		if (path === '/api/market') {
			return route.fulfill({
				json: {
					event: {
						id: 'pwa-market',
						status: 'registration_open',
						registrationOpensAt: '2020-01-01T00:00:00Z',
						registrationClosesAt: '2099-01-01T00:00:00Z',
					},
					questions: [],
					counts: {},
				},
			});
		}

		if (path === '/api/visit') {
			return route.fulfill({
				json: {
					id: 'pwa-visit',
					marketEventId: 'pwa-market',
					status: 'registered',
					queuePosition: null,
					priorityNumber: null,
					aheadOfYou: null,
					nowCalling: null,
					called: [],
					calledPriority: [],
					calledAt: null,
				},
			});
		}

		if (path === '/api/notification-status') {
			return route.fulfill({ json: { smsConsented: false, pushSubscribed: false } });
		}

		return route.fulfill({ json: { configured: false } });
	});
}

async function seedGuest(page: Page) {
	await page.addInitScript(() => {
		localStorage.setItem('bay-compassion.guest-device-token', JSON.stringify('pwa-device-token'));
		localStorage.setItem(
			'bay-compassion.guest-identity',
			JSON.stringify({ firstName: 'Ada', lastName: 'Lovelace', phone: '5551234567' }),
		);
		localStorage.setItem('bay-compassion.visit-token', 'pwa-visit-token');
		localStorage.setItem('bay-compassion.locale', 'en');
		localStorage.setItem('bay-compassion.returning-visitor', 'true');
		localStorage.setItem('bay-compassion.guest-tour-seen', 'true');
	});
}

test(
	'iOS installation carries the same guest and visit into a fresh app storage area',
	{ tag: '@small' },
	async ({ browser, baseURL }) => {
		const source = await browser.newContext({
			baseURL,
			userAgent: safari,
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
		});
		const page = await source.newPage();

		try {
			await marketApi(page);
			await seedGuest(page);
			await page.goto('/');
			await page.getByRole('button', { name: 'Add to Home Screen', exact: true }).click();
			await expect(page.getByRole('dialog', { name: 'Add a Market Icon' })).toBeVisible();
			// A path-scoped cookie never accompanies ordinary app/API requests or appears in the URL.
			expect(await page.evaluate(() => document.cookie)).not.toContain('pwa-handoff');
			expect(page.url()).not.toContain('token');
			const cookies = (await source.cookies()).filter(
				(cookie) => cookie.name === 'bay-compassion.pwa-handoff',
			);

			expect(cookies).toHaveLength(1);
			expect(cookies[0]?.path).toBe('/pwa-start');

			// iOS 17.2+ copies cookies, not localStorage. Simulate the documented OS boundary.
			const installed = await browser.newContext({
				baseURL,
				userAgent: safari,
				viewport: { width: 390, height: 844 },
				isMobile: true,
				hasTouch: true,
			});

			try {
				await installed.addCookies(cookies);
				const app = await installed.newPage();

				// Recovery stays available if the rollout is stopped after the guest adds the icon.
				await marketApi(app, { android: false, ios: false });
				await app.addInitScript(() => {
					const original = window.matchMedia.bind(window);

					window.matchMedia = (query) => {
						const media = original(query);

						if (query === '(display-mode: standalone)') {
							Object.defineProperty(media, 'matches', { value: true });
						}

						return media;
					};
				});
				await app.goto('/pwa-start');
				await expect(app.getByText('Ada L', { exact: true })).toBeVisible();
				await expect(app.getByRole('heading', { name: 'You’re in the lottery!' })).toBeVisible();
				expect(await app.evaluate(() => localStorage.getItem('bay-compassion.visit-token'))).toBe(
					'pwa-visit-token',
				);
				await expect(
					app.getByRole('button', { name: 'Add to Home Screen', exact: true }),
				).toHaveCount(0);
				expect(
					(await installed.cookies()).some(
						(cookie) => cookie.name === 'bay-compassion.pwa-handoff',
					),
				).toBe(false);
			} finally {
				await installed.close();
			}
		} finally {
			await source.close();
		}
	},
);

test(
	'the Android rollout does not show the install offer on iPhone',
	{ tag: '@small' },
	async ({ browser, baseURL }) => {
		const context = await browser.newContext({ baseURL, userAgent: safari });

		try {
			const page = await context.newPage();

			await marketApi(page, { android: true, ios: false });
			await seedGuest(page);
			await page.goto('/');
			await expect(page.getByRole('heading', { name: 'You’re in the lottery!' })).toBeVisible();
			await expect(
				page.getByRole('button', { name: 'Add to Home Screen', exact: true }),
			).toHaveCount(0);
		} finally {
			await context.close();
		}
	},
);
