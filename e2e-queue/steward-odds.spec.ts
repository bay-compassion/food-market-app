import { adminTranslations } from '../src/adminLocales';
import { confirm, expect, test } from './fixtures';

const adminCopy = adminTranslations.en;

test(
	'a steward raises a guest’s odds, and the draw uses them and reports them',
	{ tag: '@large' },
	async ({ admin, database, guestBrowser }) => {
		await test.step('Four guests register for three places', async () => {
			for (const [index, name] of ['Ada', 'Bea', 'Cam', 'Dan'].entries()) {
				const guest = await guestBrowser(name);

				await guest.register(`202555010${index}`);
			}
		});
		await test.step('A steward raises one guest', async () => {
			await admin.goto('/steward/guests');
			await admin.getByRole('button', { name: /Ada QueueTest/ }).click();
			await admin.getByRole('button', { name: 'Adjust Odds' }).click();
			await admin.getByRole('button', { name: 'Highest ×5' }).click();
			await admin.getByRole('button', { name: 'Until Changed' }).click();
			await admin.getByRole('button', { name: 'Staff judgment' }).click();
			await admin.getByRole('button', { name: 'Save Odds' }).click();
			// A toast hides itself, so the sheet closing is the steadier sign that the save finished.
			await expect(admin.getByRole('dialog')).toBeHidden();
			await admin.goto('/steward/draw');
			await expect(admin.getByText('4 in the Draw, 3 Spots')).toBeVisible();
		});
		await test.step('The draw runs through the admin screen', async () => {
			await admin.goto('/admin/current-session');
			await admin.getByRole('button', { name: adminCopy.closeRegistration, exact: true }).click();
			await confirm(admin);
			await expect(
				admin.getByRole('button', { name: adminCopy.runLottery, exact: true }),
			).toBeVisible({ timeout: 50_000 });
			await admin.getByRole('button', { name: adminCopy.runLottery, exact: true }).click();
			await confirm(admin);
			await expect
				.poll(
					async () =>
						(await database.visits()).filter((visit) => visit.status === 'registered').length,
				)
				.toBe(0);
		});
		await test.step('The visit keeps the weight used, and the rule is only recorded', async () => {
			const visits = await database.visits();

			expect(visits.find((visit) => visit.first_name === 'Ada')?.lottery_weight).toBe(5);
			expect(visits.filter((visit) => visit.lottery_weight === 1)).toHaveLength(3);
			expect(visits.every((visit) => visit.suggested_lottery_weight === 1)).toBe(true);
		});
		await test.step('The steward screens report it', async () => {
			await admin.goto('/steward/draw');
			await admin.getByRole('button', { name: 'Last Draw' }).click();
			await expect(admin.getByText('3 Got a Number, 1 Missed')).toBeVisible();
			await admin.goto('/steward/changes');
			await expect(admin.getByRole('rowheader', { name: 'Ada QueueTest' })).toBeVisible();
			await expect(admin.getByText('×1 to ×5')).toBeVisible();
		});
	},
);
