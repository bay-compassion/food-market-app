import { expect, test } from '@playwright/test';

test('static SMS consent evidence is publicly reviewable', async ({ page }) => {
	await page.goto('/sms-consent/index.html');

	await expect(page).toHaveTitle('SMS Consent Evidence | The Bay Compassion');
	await expect(page.getByRole('heading', { level: 1, name: 'SMS Consent Flow' })).toBeVisible();
	await expect(page.getByRole('img')).toHaveCount(5);
	await expect(page.locator('script[src="/src/main.tsx"]')).toHaveCount(0);
	await expect(page.locator('#app')).toHaveCount(0);
	await expect(page.locator('.site-header')).toHaveCSS('background-color', 'rgb(2, 57, 64)');
	await expect(page.locator('.evidence article').first()).toHaveCSS('display', 'grid');

	const stylesheetResponse = await page.request.get('/sms-consent/styles.css');

	expect(stylesheetResponse.ok()).toBe(true);
	expect(stylesheetResponse.headers()['content-type']).toContain('text/css');

	const screenshots = page.locator('.evidence img');

	await expect(screenshots).toHaveCount(5);

	for (const screenshot of await screenshots.all()) {
		await expect(screenshot).toBeVisible();
		await expect(screenshot).toHaveJSProperty('complete', true);
		await expect(screenshot).not.toHaveJSProperty('naturalWidth', 0);
	}

	await expect(page.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
		'href',
		'https://app.thebaycompassion.org/privacy',
	);
	await expect(page.getByRole('link', { name: 'Terms & Conditions' })).toHaveAttribute(
		'href',
		'https://app.thebaycompassion.org/terms',
	);
});
