import { expect, test } from '@playwright/test';

test('first-time guest can choose a language', async ({ page }) => {
	await page.goto('/');

	await expect(
		page.getByRole('heading', { name: 'Welcome to the community food market' }),
	).toBeVisible();

	const languageGroup = page.getByRole('group', { name: 'Choose your language' });
	await expect(languageGroup.getByRole('button', { name: 'English' })).toHaveAttribute(
		'aria-pressed',
		'true',
	);

	await languageGroup.getByRole('button', { name: 'Español' }).click();

	// Choosing a language marks the visitor as returning, which swaps the language hero below for
	// a compact picker in the header — see `selectLanguage` in `src/App.vue`.
	await expect(languageGroup).not.toBeVisible();
	const headerPicker = page.getByLabel('Idioma');
	await expect(headerPicker).toBeVisible();
	await expect(headerPicker).toHaveValue('es');
});
