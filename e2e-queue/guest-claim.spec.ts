import { adminTranslations } from '../src/adminLocales';
import { translations } from '../src/locales';
import { test, expect } from './fixtures';

const adminCopy = adminTranslations.en;
const guestCopy = translations.en;
const claimCopy = translations.en.claimView;

test('a guest added by hand takes their record onto their own phone with a single-use QR code', async ({
	admin,
	database,
	guestBrowser,
}) => {
	let claimPath = '';

	await test.step('Admin adds a guest by hand; no phone holds their record yet', async () => {
		await admin.getByRole('button', { name: `+ ${adminCopy.addGuest}`, exact: true }).click();
		await admin.getByRole('textbox', { name: guestCopy.firstName }).fill('Eve');
		await admin.getByRole('textbox', { name: guestCopy.lastName }).fill('QueueTest');
		await admin.getByRole('textbox', { name: guestCopy.phone }).fill('2025550199');
		await admin.getByRole('combobox', { name: guestCopy.age, exact: true }).selectOption('30-44');
		await admin.getByRole('textbox', { name: guestCopy.household, exact: true }).fill('1');
		await admin.getByRole('textbox', { name: guestCopy.childrenCount, exact: true }).fill('0');
		await admin.getByRole('textbox', { name: guestCopy.seniorsCount, exact: true }).fill('0');
		await admin.getByRole('button', { name: adminCopy.saveGuest, exact: true }).click();
		await expect(admin.getByText('Eve QueueTest was added.', { exact: true })).toBeVisible();
		// The add button sits at the foot of the screen; the offer must not be left above the fold.
		await expect(
			admin.getByRole('button', { name: adminCopy.guestClaimShow, exact: true }),
		).toBeInViewport();
		expect(await database.guests()).toEqual([
			{ first_name: 'Eve', has_device: false, outstanding_claims: 0 },
		]);
	});
	await test.step('Admin shows a QR code for the guest’s phone', async () => {
		const claimResponse = admin.waitForResponse(
			(response) => new URL(response.url()).pathname === '/api/admin/guest-claims',
		);

		await admin.getByRole('button', { name: adminCopy.guestClaimShow, exact: true }).click();
		const response = await claimResponse;

		expect(response.status()).toBe(201);
		claimPath = `/claim#${((await response.json()) as { token: string }).token}`;
		await expect(admin.getByRole('img', { name: adminCopy.guestClaimImageAlt })).toBeVisible();
		expect(await database.guests()).toEqual([
			{ first_name: 'Eve', has_device: false, outstanding_claims: 1 },
		]);
	});
	await test.step('The guest scans it, taps once, and follows their own visit', async () => {
		const guest = await guestBrowser('Eve');

		await guest.page.goto(claimPath);
		// The code leaves the address bar as soon as it has been read.
		await expect(guest.page).toHaveURL(/\/claim$/);
		await guest.page.getByRole('button', { name: claimCopy.submit, exact: true }).click();
		await expect(guest.page).toHaveURL(/\/$/);
		await expect(
			guest.page.getByRole('heading', { name: guestCopy.guestView.visitStatus.registered.header }),
		).toBeVisible();
		await expect(guest.page.getByText('Eve Q', { exact: true })).toBeVisible();
		expect(await database.guests()).toEqual([
			{ first_name: 'Eve', has_device: true, outstanding_claims: 0 },
		]);
	});
	await test.step('The same code scanned again is refused and changes nothing', async () => {
		const stranger = await guestBrowser('Fay');

		await stranger.page.goto(claimPath);
		await stranger.page.getByRole('button', { name: claimCopy.submit, exact: true }).click();
		await expect(stranger.page.getByRole('alert')).toHaveText(claimCopy.failed);
		await expect(stranger.page).toHaveURL(/\/claim$/);
	});
});

test('a guest saved with details only has no visit, appears in the database, and registers from their phone', async ({
	admin,
	database,
	guestBrowser,
}) => {
	let claimPath = '';

	await test.step('Admin saves only the guest’s details from the guest database', async () => {
		await admin.goto('/admin/guest-database');
		await admin.getByRole('button', { name: `+ ${adminCopy.addGuest}`, exact: true }).click();
		await admin.getByRole('textbox', { name: guestCopy.firstName }).fill('Gil');
		await admin.getByRole('textbox', { name: guestCopy.lastName }).fill('QueueTest');
		await admin.getByRole('textbox', { name: guestCopy.phone }).fill('2025550198');
		await admin
			.getByRole('combobox', { name: adminCopy.admissionLabel })
			.selectOption({ label: adminCopy.admitProfileOnly });
		// Household details belong to a visit, so they are not asked for.
		await expect(admin.getByRole('textbox', { name: guestCopy.household })).toHaveCount(0);
		await admin.getByRole('button', { name: adminCopy.saveGuest, exact: true }).click();
		await expect(admin.getByText('Gil QueueTest was added.', { exact: true })).toBeVisible();
		await expect(admin.getByRole('gridcell', { name: 'Gil QueueTest' })).toBeVisible();
		expect(await database.guests()).toEqual([
			{ first_name: 'Gil', has_device: false, outstanding_claims: 0 },
		]);
		expect(await database.visits()).toEqual([]);
	});
	await test.step('Admin shows the QR code; the guest’s phone takes the record', async () => {
		const claimResponse = admin.waitForResponse(
			(response) => new URL(response.url()).pathname === '/api/admin/guest-claims',
		);

		await admin.getByRole('button', { name: adminCopy.guestClaimShow, exact: true }).click();
		claimPath = `/claim#${((await (await claimResponse).json()) as { token: string }).token}`;

		const guest = await guestBrowser('Gil');

		await guest.page.goto(claimPath);
		await guest.page.getByRole('button', { name: claimCopy.submit, exact: true }).click();
		await expect(guest.page).toHaveURL(/\/$/);
		await expect(guest.page.getByText('Gil Q', { exact: true })).toBeVisible();
		// Registration is open and the phone knows who they are, so only the visit fields are asked.
		await expect(guest.page.getByRole('textbox', { name: guestCopy.household })).toBeVisible();
		await expect(guest.page.getByRole('textbox', { name: guestCopy.firstName })).toHaveCount(0);
		expect(await database.guests()).toEqual([
			{ first_name: 'Gil', has_device: true, outstanding_claims: 0 },
		]);
		expect(await database.visits()).toEqual([]);
	});
});
