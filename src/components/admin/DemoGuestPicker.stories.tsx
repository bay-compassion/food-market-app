import type { Meta, StoryObj } from '@storybook/react-vite';
import { runInAction } from 'mobx';
import { useState } from 'react';
import { expect, userEvent } from 'storybook/test';

import { AdminApi } from '../../services/admin-api';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
import { DemoGuestPicker } from './DemoGuestPicker';

function Fixture({ state }: { state: 'populated' | 'empty' | 'loading' | 'failure' | 'paged' }) {
	const [store] = useState(() => {
		const root = new RootStore({
			admin: { api: new AdminApi({ request: () => new Promise<Response>(() => {}) }) },
		});

		root.session.applyServerState({ event: null, questions: [], counts: {} });
		root.admin.demo.save(
			{
				marketEventId: 'ended-demo',
				guests:
					state === 'empty'
						? []
						: Array.from({ length: state === 'paged' ? 12 : 1 }, (_, index) => ({
								id: `demo-${index}`,
								firstName: 'Ada',
								lastName: state === 'paged' ? `Example ${index + 1}` : 'Example',
								phone: '5105550123',
								locale: index % 2 ? 'es' : 'en',
								deviceToken: 'story-device',
								household: null,
								visit: {
									id: `visit-${index}`,
									token: 'story-visit',
									status: 'waiting' as const,
									queuePosition: index + 1,
								},
							})),
			},
			null,
		);

		if (state === 'failure') {
			runInAction(() => {
				root.admin.demo.openError = true;
			});
		}

		if (state === 'loading') {
			void root.admin.loadDemoScenario('draft');
		}

		return root;
	});

	return (
		<RootStoreProvider store={store}>
			<DemoGuestPicker />
		</RootStoreProvider>
	);
}

const meta = {
	title: 'Admin/Demo guest picker',
	component: Fixture,
	parameters: { shell: 'admin' },
} satisfies Meta<typeof Fixture>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Populated: Story = {
	args: { state: 'populated' },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('button', { name: 'View as guest: Ada Example' })).toBeVisible();
	},
};
export const Empty: Story = {
	args: { state: 'empty' },
	play: async ({ canvas }) => {
		await expect(canvas.getByText('This scenario has no demo guests.')).toBeVisible();
	},
};
export const Loading: Story = {
	args: { state: 'loading' },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('status')).toHaveTextContent('Loading demo guests');
	},
};
export const Failure: Story = {
	args: { state: 'failure' },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('alert')).toHaveTextContent('Allow popups');
	},
};

export const Paginated: Story = {
	args: { state: 'paged' },
	play: async ({ canvas }) => {
		await expect(canvas.getAllByRole('button', { name: /^View as guest:/ })).toHaveLength(5);
		await expect(canvas.getAllByText('Español (es)')[0]).toBeVisible();
		await userEvent.click(canvas.getByRole('button', { name: 'Go to next page' }));
		await expect(
			canvas.getByRole('button', { name: 'View as guest: Ada Example 6' }),
		).toBeVisible();
		await expect(
			canvas.queryByRole('button', { name: 'View as guest: Ada Example 1' }),
		).not.toBeInTheDocument();
		await userEvent.click(canvas.getByRole('button', { name: 'Go to next page' }));
		await expect(canvas.getAllByRole('button', { name: /^View as guest:/ })).toHaveLength(2);
		await expect(canvas.getByRole('button', { name: 'Go to next page' })).toBeDisabled();
	},
};

export const Sortable: Story = {
	args: { state: 'paged' },
	play: async ({ canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Go to next page' }));
		await userEvent.click(canvas.getByRole('button', { name: 'Sort by queue' }));
		await expect(canvas.getByRole('button', { name: 'Go to previous page' })).toBeDisabled();
		await userEvent.click(canvas.getByRole('button', { name: 'Sort by queue' }));
		await expect(canvas.getAllByRole('button', { name: /^View as guest:/ })[0]).toHaveTextContent(
			'Ada Example 12',
		);
		await expect(canvas.getByRole('columnheader', { name: 'Queue' })).toHaveAttribute(
			'aria-sort',
			'descending',
		);
		await userEvent.click(canvas.getByRole('button', { name: 'Sort by number' }));
		await expect(canvas.getAllByRole('button', { name: /^View as guest:/ })[0]).toHaveTextContent(
			'Ada Example 1',
		);

		for (const name of ['guest preview', 'language', 'status']) {
			await userEvent.click(canvas.getByRole('button', { name: `Sort by ${name}` }));
			await expect(
				canvas.getByRole('columnheader', { name: new RegExp(`^${name}$`, 'i') }),
			).toHaveAttribute('aria-sort', 'ascending');
		}
	},
};
