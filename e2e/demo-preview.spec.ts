import { expect, test } from '@playwright/test';

// Exercises the real tab handoff and guest UI with API responses supplied by Playwright.
// Auth0 and the scenario loader's authorization are covered by handler/component tests.
test('demo tab follows live visits, cancels, and retains isolated identity on refresh', async ({
	page,
	context,
}) => {
	let status = 'waiting';
	let ahead = 2;

	await context.route('**/api/market', (route) =>
		route.fulfill({
			json: {
				event: {
					id: 'demo-event',
					status: 'service_started',
					sessionMode: 'scheduled',
					capacity: 30,
					registrationOpensAt: '2026-01-01T10:00:00Z',
					registrationClosesAt: '2026-01-01T11:00:00Z',
				},
				questions: [],
				counts: { waiting: 3 },
			},
		}),
	);
	await context.route('**/api/visit', async (route) => {
		expect(route.request().headers().authorization).toBe('Bearer demo-visit-token');

		if (route.request().method() === 'PATCH') {
			status = 'cancelled';
		}
		await route.fulfill({
			json: {
				id: 'demo-visit',
				marketEventId: 'demo-event',
				status,
				queuePosition: 3,
				aheadOfYou: ahead,
			},
		});
	});
	await page.goto('/');
	await page.evaluate(async () => {
		localStorage.setItem('bay-compassion.guest-device-token', JSON.stringify('normal-device'));
		localStorage.setItem('bay-compassion.locale', 'en');
		const modulePath = '/src/stores/demo-preview-session.ts';
		const { DemoPreviewSession } = await import(/* @vite-ignore */ modulePath);
		const button = document.createElement('button');

		button.textContent = 'Launch demo guest';
		button.onclick = () =>
			DemoPreviewSession.open({
				id: 'demo-guest',
				firstName: 'Ada',
				lastName: 'Example',
				phone: '5105550123',
				locale: 'en',
				deviceToken: 'demo-device-token',
				household: null,
				visit: { id: 'demo-visit', token: 'demo-visit-token', status: 'waiting', queuePosition: 3 },
			});
		document.body.append(button);
	});
	const popupPromise = context.waitForEvent('page');

	await page.getByRole('button', { name: 'Launch demo guest' }).click();
	const guest = await popupPromise;

	await expect(guest.getByRole('complementary', { name: 'Demo guest preview' })).toContainText(
		'Ada Example',
	);
	await expect(guest.getByRole('button', { name: 'Cancel', exact: false })).toBeVisible();
	await guest.reload();
	await expect(guest.getByRole('complementary', { name: 'Demo guest preview' })).toContainText(
		'Ada Example',
	);
	await expect(guest.getByRole('button', { name: 'Cancel', exact: false })).toBeVisible();

	// Polling must fetch the changed queue, without reloading the tab.
	ahead = 1;
	await guest.waitForResponse((response) => response.url().endsWith('/api/visit'), {
		timeout: 20_000,
	});
	await expect(guest.locator('.guests-ahead strong')).toHaveText('1', { timeout: 20_000 });
	guest.on('dialog', (dialog) => dialog.accept());
	await guest.getByRole('button', { name: 'Cancel', exact: false }).click();
	await expect(guest.getByRole('button', { name: 'Cancel', exact: false })).toHaveCount(0);
	await expect.poll(() => status).toBe('cancelled');
	await expect(guest).toHaveURL('http://localhost:5173/');
	expect(await guest.evaluate(() => window.opener)).toBeNull();
	expect(await page.evaluate(() => localStorage.getItem('bay-compassion.guest-device-token'))).toBe(
		JSON.stringify('normal-device'),
	);
	expect(await page.evaluate(() => localStorage.getItem('bay-compassion.locale'))).toBe('en');
});
