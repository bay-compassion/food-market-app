import { expect, test } from '@playwright/test';

test('privacy policy renders', async ({ page }) => {
	await page.goto('/privacy');

	await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible();
});

test('terms and conditions render', async ({ page }) => {
	await page.goto('/terms');

	await expect(page.getByRole('heading', { level: 1, name: 'Terms and Conditions' })).toBeVisible();
});
