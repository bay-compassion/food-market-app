import { adminTranslations } from '../src/adminLocales';
import { translations } from '../src/locales';
import { test, expect, type GuestBrowser } from './fixtures';

const adminCopy = adminTranslations.en;
const copy = translations.en.guestView.visitStatus;

test('guests register, enter the lottery, and follow the live queue through service and cancellation', async ({
	admin,
	database,
	guestBrowser,
}) => {
	const guests = new Map<string, GuestBrowser>();

	await test.step('Four guests register for three places', async () => {
		for (const [index, name] of ['Ada', 'Bea', 'Cam', 'Dan'].entries()) {
			const guest = await guestBrowser(name);

			guests.set(name, guest);
			await guest.register(`202555010${index}`);
		}
		await expect
			.poll(async () => (await database.visits()).map((visit) => visit.status))
			.toEqual(Array(4).fill('registered'));
	});
	await test.step('Admin closes registration and waits for the real grace period', async () => {
		await admin.getByRole('button', { name: adminCopy.closeRegistration, exact: true }).click();
		await expect(
			admin.getByRole('button', { name: adminCopy.runLottery, exact: true }),
		).toBeVisible({ timeout: 50_000 });
	});
	await test.step('Admin runs the lottery; guests see their actual results', async () => {
		await admin.getByRole('button', { name: adminCopy.runLottery, exact: true }).click();
		await expect
			.poll(
				async () => (await database.visits()).filter((visit) => visit.status === 'waiting').length,
			)
			.toBe(3);
		const visits = await database.visits();

		expect(
			visits.filter((visit) => visit.status === 'waiting').map((visit) => visit.queue_position),
		).toEqual([1, 2, 3]);
		expect(visits.filter((visit) => visit.status === 'not_placed')).toHaveLength(1);

		for (const visit of visits) {
			const page = guests.get(visit.first_name)!.page;

			await page.bringToFront();

			if (visit.status === 'waiting') {
				await expect(page.locator('.queue-position strong')).toHaveText(
					String(visit.queue_position),
				);
			} else {
				await expect(
					page.getByRole('heading', { name: copy.labels.not_placed, exact: true }),
				).toBeVisible();
			}
		}
	});
	const [first, second, third] = (await database.visits()).filter(
		(visit) => visit.status === 'waiting',
	);
	const firstGuest = guests.get(first!.first_name)!;
	const secondGuest = guests.get(second!.first_name)!;
	const thirdGuest = guests.get(third!.first_name)!;

	await test.step('Admin calls the next guest; their browser updates without a reload', async () => {
		await admin.getByRole('button', { name: adminCopy.goToQueue, exact: true }).click();
		const responsePromise = admin.waitForResponse(
			(response) =>
				new URL(response.url()).pathname === '/api/admin/queue' &&
				response.request().method() === 'POST',
		);

		await admin.getByRole('button', { name: adminCopy.callNext, exact: true }).click();
		expect((await responsePromise).status()).toBe(200);
		await firstGuest.page.bringToFront();
		await expect(firstGuest.page.getByRole('heading', { name: copy.called.header })).toBeVisible();
		const visit = (await database.visits()).find((visit) => visit.id === first!.id)!;

		expect(visit.status).toBe('called');
		expect(visit.called_at).not.toBeNull();
	});
	await test.step('Admin serves the called guest; remaining guests advance', async () => {
		await admin
			.getByRole('button', {
				name: `${adminCopy.markServed}: ${first!.first_name} QueueTest`,
				exact: true,
			})
			.click();
		await firstGuest.page.bringToFront();
		await expect(
			firstGuest.page.getByRole('heading', { name: copy.labels.served, exact: true }),
		).toBeVisible();
		await thirdGuest.page.bringToFront();
		await expect(thirdGuest.page.locator('.guests-ahead strong')).toHaveText('1');
		const visit = (await database.visits()).find((visit) => visit.id === first!.id)!;

		expect(visit.status).toBe('served');
		expect(visit.served_at).not.toBeNull();
	});
	await test.step('A waiting guest cancels; the next guest sees nobody ahead', async () => {
		secondGuest.page.once('dialog', (dialog) => void dialog.accept());
		await secondGuest.page.getByRole('button', { name: copy.cancelAction, exact: true }).click();
		await expect(
			secondGuest.page.getByRole('button', { name: copy.cancelAction, exact: true }),
		).toHaveCount(0);
		await expect
			.poll(async () => (await database.visits()).find((visit) => visit.id === second!.id)?.status)
			.toBe('cancelled');
		await expect(
			secondGuest.page.getByRole('heading', { name: copy.labels.cancelled, exact: true }),
		).toBeVisible();
		await thirdGuest.page.bringToFront();
		await expect(thirdGuest.page.getByText(copy.waiting.youAreNext, { exact: true })).toBeVisible();
	});
});

test('admin API rejects missing and invalid tokens', async ({ request }) => {
	for (const headers of [{}, { Authorization: 'Bearer invalid-token' }] as Record<
		string,
		string
	>[]) {
		const response = await request.post('/api/admin/queue', {
			headers,
			data: { action: 'call_next', count: 1 },
		});

		expect(response.status()).toBe(401);
	}
});
