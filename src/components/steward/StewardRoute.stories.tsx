import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import type { Permission } from '../../services/permissions';
import type { StewardLedgerResponse } from '../../services/steward-api';
import { StewardStore } from '../../stores/steward.store';
import { AdminThemeProvider } from '../admin/AdminThemeProvider';
import { StewardProvider } from './steward-context';
import { stewardFixture } from './steward.fixture';
import { StewardScreens } from './StewardRoute';

type Args = { view: string; permissions: Permission[]; ledger?: StewardLedgerResponse };

function Seeded({ view, permissions, ledger = stewardFixture }: Args) {
	const [store] = useState(() => {
		const created = new StewardStore({
			api: {
				readLedger: () => Promise.resolve(ledger),
				saveOdds: () => Promise.resolve(),
			},
			readPermissions: () => Promise.resolve(permissions),
		});

		void created.load();

		return created;
	});

	return (
		<AdminThemeProvider>
			<StewardProvider store={store}>
				<StewardScreens view={view} />
			</StewardProvider>
		</AdminThemeProvider>
	);
}

const everything: Permission[] = ['read:stewardship', 'manage:stewardship'];

const meta = {
	title: 'Steward/Screens',
	component: Seeded,
	parameters: { shell: 'bare' },
} satisfies Meta<typeof Seeded>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Draw: Story = {
	args: { view: 'draw', permissions: everything },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(await canvas.findByText('200 in the Draw, 100 Spots')).toBeInTheDocument();
		await userEvent.click(canvas.getByRole('button', { name: 'Last Draw' }));
		await expect(await canvas.findByText('100 Got a Number, 100 Missed')).toBeInTheDocument();
	},
};

export const DrawThatSkippedOdds: Story = {
	args: {
		view: 'draw',
		permissions: everything,
		ledger: {
			...stewardFixture,
			upcoming: null,
			draws: stewardFixture.draws.map((draw) => ({ ...draw, oddsSkipped: true })),
		},
	},
	play: async ({ canvasElement }) => {
		await expect(await within(canvasElement).findByRole('alert')).toHaveTextContent(
			'ran without saved odds',
		);
	},
};

export const Guests: Story = {
	args: { view: 'guests', permissions: everything },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await userEvent.click(await canvas.findByRole('button', { name: /Rosa Delgado/ }));
		await expect(await canvas.findByRole('button', { name: 'Adjust Odds' })).toBeInTheDocument();
		await userEvent.click(canvas.getByRole('button', { name: 'Adjust Odds' }));

		const dialog = within(document.body);

		await userEvent.click(await dialog.findByRole('button', { name: 'Save Odds' }));
		await expect(await dialog.findByText('Choose a reason before saving.')).toBeInTheDocument();
	},
};

export const GuestsWithoutChanging: Story = {
	args: { view: 'guests', permissions: ['read:stewardship'] },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await userEvent.click(await canvas.findByRole('button', { name: /Rosa Delgado/ }));
		await expect(canvas.queryByRole('button', { name: 'Adjust Odds' })).toBeNull();
	},
};

export const Patterns: Story = {
	args: { view: 'patterns', permissions: everything },
	play: async ({ canvasElement }) => {
		await expect(await within(canvasElement).findByText('Longest Shut Out')).toBeInTheDocument();
	},
};

export const Changes: Story = {
	args: { view: 'changes', permissions: everything },
	play: async ({ canvasElement }) => {
		await expect(await within(canvasElement).findByText('Rosa Delgado')).toBeInTheDocument();
	},
};

export const Automatic: Story = {
	args: { view: 'automatic', permissions: everything },
	play: async ({ canvasElement }) => {
		await expect(await within(canvasElement).findByText('Off · Preview Only')).toBeInTheDocument();
	},
};

export const WithoutTheRole: Story = {
	args: { view: 'draw', permissions: ['run:queue'] },
	play: async ({ canvasElement }) => {
		await expect(
			await within(canvasElement).findByText("You Don't Have Access to This Page"),
		).toBeInTheDocument();
	},
};
