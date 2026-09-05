import { test as base, expect, devices, type BrowserContext, type Page } from '@playwright/test';

import { translations } from '../src/locales';
import { QueueDatabase } from './queue-database';
import { readRigState } from './rig-state';

export class GuestBrowser {
	constructor(
		readonly page: Page,
		readonly firstName: string,
	) {}

	async register(phone: string) {
		const t = translations.en;

		await this.page.goto('/');
		await this.page.getByRole('textbox', { name: t.firstName }).fill(this.firstName);
		await this.page.getByRole('textbox', { name: t.lastName }).fill('QueueTest');
		await this.page.getByRole('textbox', { name: t.phone }).fill(phone);
		await this.page.getByRole('combobox', { name: t.age, exact: true }).selectOption('30-44');
		await this.page.getByRole('textbox', { name: t.household, exact: true }).fill('1');
		await this.page.getByRole('textbox', { name: t.childrenCount, exact: true }).fill('0');
		await this.page.getByRole('textbox', { name: t.seniorsCount, exact: true }).fill('0');
		await this.page.getByRole('button', { name: t.submit, exact: true }).click();
		await expect(
			this.page.getByRole('heading', { name: t.guestView.visitStatus.registered.header }),
		).toBeVisible();
	}
}

export const test = base.extend<{
	database: QueueDatabase;
	admin: Page;
	guestBrowser: (name: string) => Promise<GuestBrowser>;
}>({
	database: [
		// Playwright requires destructuring even for a fixture with no dependencies.
		// oxlint-disable-next-line no-empty-pattern
		async ({}, use) => {
			const database = new QueueDatabase();

			await database.reset();
			await use(database);
		},
		{ auto: true },
	],
	admin: async ({ page, baseURL }, use) => {
		const { adminToken } = readRigState();

		await page.context().route(`${baseURL}/api/admin{,/**}`, async (route) => {
			await route.continue({
				headers: { ...route.request().headers(), authorization: `Bearer ${adminToken}` },
			});
		});
		await page.goto('/admin/current-session');
		page.on('dialog', (dialog) => void dialog.accept());
		await use(page);
	},
	guestBrowser: async ({ browser, contextOptions, baseURL }, use, testInfo) => {
		const contexts: BrowserContext[] = [];

		try {
			await use(async (name) => {
				const context = await browser.newContext({
					...contextOptions,
					...devices['Pixel 7'],
					baseURL,
					locale: 'en-US',
				});

				contexts.push(context);
				await context.addInitScript(() => localStorage.setItem('bay-compassion.locale', 'en'));

				return new GuestBrowser(await context.newPage(), name);
			});
		} finally {
			for (const [index, context] of contexts.entries()) {
				if (testInfo.status !== testInfo.expectedStatus) {
					const page = context.pages()[0];

					if (page) {
						await testInfo.attach(`guest-${index}`, {
							body: await page.screenshot(),
							contentType: 'image/png',
						});
					}
				}
				await context.close();
			}
		}
	},
});
export { expect };
