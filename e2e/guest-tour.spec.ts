import { expect, type Page, test } from '@playwright/test';

import { GUEST_TOUR_FLAG_KEY } from '../src/components/hooks/use-guest-tour-enabled';

const minutes = (count: number) => count * 60_000;

/**
 * Answers the app's API with a market whose registration is open and a guest with no visit, so the
 * tour meets the screen a guest scanning the code at 10:30 does — the one most of its steps point
 * at — rather than whatever a live backend happens to be doing.
 */
async function openRegistration(page: Page): Promise<void> {
	await page.route('**/api/**', (route) => {
		const { pathname } = new URL(route.request().url());

		if (pathname === '/api/market') {
			const now = Date.now();

			return route.fulfill({
				json: {
					event: {
						id: 'e2e-market',
						status: 'registration_open',
						capacity: 60,
						registrationOpensAt: new Date(now - minutes(5)).toISOString(),
						registrationClosesAt: new Date(now + minutes(10)).toISOString(),
					},
					questions: [],
					counts: {},
				},
			});
		}

		return route.fulfill({ status: 404, json: { error: 'Not found.' } });
	});
}

/**
 * Answers LaunchDarkly with the `guest-tour` flag pinned, so a spec does not depend on what the
 * real project has it set to. Every other flag is left out of the answer, so it reads as its hook's
 * own default; the streaming connection is refused, since its first message would replace these
 * flags with the project's real ones.
 */
async function pinTourFlag(page: Page, value: boolean): Promise<void> {
	await page.unroute(/launchdarkly\.com/);
	await page.route(/launchdarkly\.com/, (route) => {
		const { hostname, pathname } = new URL(route.request().url());

		if (hostname.startsWith('clientsdk.') && pathname.startsWith('/sdk/evalx/')) {
			return route.fulfill({
				json: { [GUEST_TOUR_FLAG_KEY]: { value, variation: value ? 0 : 1, version: 1 } },
			});
		}

		return hostname.startsWith('events.') ? route.fulfill({ status: 202 }) : route.abort();
	});
}

test.beforeEach(async ({ page }) => {
	await pinTourFlag(page, true);
	await openRegistration(page);
});

test('a first-time guest is offered the tour once, and can replay it from the menu', async ({
	page,
}) => {
	await page.goto('/');

	await page
		.getByRole('group', { name: 'Choose your language' })
		.getByRole('button', { name: 'English' })
		.click();

	// Offered once the introduction has folded into the app bar — see `use-language-choice.ts`.
	const welcome = page.getByRole('alertdialog', { name: 'Welcome! Here’s how it works' });

	await expect(welcome).toBeVisible();
	await welcome.getByRole('button', { name: 'Skip tour' }).click();
	await expect(welcome).not.toBeVisible();

	// Skipping counts as having seen it, so it is not offered again.
	await page.reload();
	await expect(page.getByRole('button', { name: 'Join the lottery' })).toBeVisible();
	await expect(page.getByRole('alertdialog')).not.toBeVisible();

	await page.getByRole('button', { name: 'Open menu' }).click();
	await page.getByRole('menuitem', { name: 'Take the tour' }).click();

	await expect(welcome).toBeVisible();
});

test('the tour points at the registration screen, clear of the app bar', async ({ page }) => {
	await page.goto('/');
	await page
		.getByRole('group', { name: 'Choose your language' })
		.getByRole('button', { name: 'English' })
		.click();
	await page.getByRole('button', { name: 'Show me' }).click();

	const appBarBottom = (await page.locator('.topbar').boundingBox())?.height ?? 0;

	for (const [title, anchor] of [
		['Sign-up opens', '[data-tour="registration-countdown"]'],
		['Fill in the form', '[data-tour="registration-form"] .form-heading'],
	] as const) {
		await page.getByRole('button', { name: 'Next' }).click();

		const step = page.getByRole('alertdialog', { name: title });

		await expect(step).toBeVisible();
		await expect(step).toBeInViewport();

		// Scrolled to, and not left tucked under the sticky app bar.
		const target = await page.locator(anchor).boundingBox();

		expect(target?.y).toBeGreaterThanOrEqual(appBarBottom);
		await expect(page.locator(anchor)).toBeInViewport();
	}
});

test('with the flag off, the tour is neither offered nor in the menu', async ({ page }) => {
	await pinTourFlag(page, false);
	await page.goto('/');
	await page
		.getByRole('group', { name: 'Choose your language' })
		.getByRole('button', { name: 'English' })
		.click();

	await expect(page.getByRole('button', { name: 'Join the lottery' })).toBeVisible();
	await expect(page.getByRole('alertdialog')).not.toBeVisible();

	await page.getByRole('button', { name: 'Open menu' }).click();
	await expect(page.getByRole('menuitem', { name: 'How it works' })).toBeVisible();
	await expect(page.getByRole('menuitem', { name: 'Take the tour' })).toHaveCount(0);
});
