import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import type { WorkerAccount } from '../../services/workers';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
import { ConfirmationDrawer } from '../ui/ConfirmationDrawer';
import { NotificationToasts } from '../ui/NotificationToasts';
import { WorkersView } from './WorkersView';

const accounts: WorkerAccount[] = [
	{
		id: 'self',
		name: 'Current Admin',
		email: 'self@example.test',
		roles: ['admin'],
		self: true,
		editable: false,
		blocked: false,
	},
	{
		id: 'owner',
		name: 'Owner',
		email: 'owner@example.test',
		roles: ['owner'],
		self: false,
		editable: false,
		blocked: false,
	},
	{
		id: 'worker',
		name: 'Volunteer',
		email: 'worker@example.test',
		roles: ['worker'],
		self: false,
		editable: true,
		blocked: false,
	},
	{
		id: 'former',
		name: 'Former Volunteer',
		email: 'former@example.test',
		roles: ['worker'],
		self: false,
		editable: true,
		blocked: true,
	},
];

function Fixture({ failure = false }: { failure?: boolean }) {
	const [store] = useState(
		() =>
			new RootStore({
				workers: {
					fetch: async () =>
						failure
							? Response.json({ error: 'Worker management is unavailable.' }, { status: 503 })
							: Response.json({ workers: accounts, page: 0, hasMore: false }),
				},
			}),
	);

	return (
		<RootStoreProvider store={store}>
			<WorkersView />
			<ConfirmationDrawer />
			<NotificationToasts />
		</RootStoreProvider>
	);
}

const meta = {
	title: 'Admin/Workers/Workers View',
	component: WorkersView,
	parameters: { shell: 'admin' },
	render: () => <Fixture />,
} satisfies Meta<typeof WorkersView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const StaffAccounts: Story = {
	play: async ({ canvas }) => {
		const owner = await canvas.findByRole('row', { name: 'owner@example.test' });

		await expect(canvas.getByRole('table', { name: 'Staff Accounts' })).toBeVisible();
		await expect(canvas.getByRole('button', { name: 'Go to next page' })).toBeDisabled();
		await expect(within(owner).queryByRole('button')).toBeNull();
		const self = canvas.getByRole('row', { name: 'self@example.test' });

		await expect(within(self).queryByRole('button')).toBeNull();
		const worker = canvas.getByRole('row', { name: 'worker@example.test' });

		await userEvent.click(
			within(worker).getByRole('button', { name: 'Actions for worker@example.test' }),
		);
		await userEvent.click(
			await within(document.body).findByRole('menuitem', { name: 'Remove Access' }),
		);
		const confirmation = await within(document.body).findByRole('alertdialog');

		await expect(confirmation).toHaveTextContent('Remove access for worker@example.test?');
		await userEvent.click(within(confirmation).getByRole('button', { name: 'Cancel' }));
	},
};
export const Unavailable: Story = {
	render: () => <Fixture failure />,
	play: async ({ canvas }) => {
		await expect(await canvas.findByRole('alert')).toHaveTextContent(
			'Worker management is unavailable.',
		);
	},
};
