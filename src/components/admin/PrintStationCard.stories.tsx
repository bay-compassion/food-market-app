import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import { AdminApi } from '../../services/admin-api';
import type { Permission } from '../../services/permissions';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
import {
	printStationFirstRunCommand,
	printStationLaunchCommand,
} from '../print-station/PrintStationSetup';
import { PrintStationCard } from './PrintStationCard';

type Station = 'online' | 'offline' | 'unknown';

type PrintStationCardArgs = { station: Station };

const t = adminTranslations.en.printStationCard;

/**
 * A store whose API answers the station check with the chosen state. "Unknown" is a worker who
 * can't run the queue, so the card never asks and shows no status.
 */
function SeededCard({ station }: PrintStationCardArgs) {
	const [store] = useState(() => {
		// `AdminApi` only ever requests a plain path string.
		const request = () => Promise.resolve(Response.json({ online: station === 'online' }));
		const permissions: Permission[] =
			station === 'unknown' ? ['manage:sessions'] : ['manage:sessions', 'run:queue'];
		const created = new RootStore({
			admin: {
				api: new AdminApi({ request: request as typeof fetch }),
				readPermissions: async () => permissions,
			},
		});

		void created.admin.loadPermissions().then(() => created.admin.checkPrintStation());

		return created;
	});

	return (
		<RootStoreProvider store={store}>
			<PrintStationCard />
		</RootStoreProvider>
	);
}

/** Keyed on the args, so changing one in the controls builds a fresh store rather than reusing one. */
function Fixture(args: PrintStationCardArgs) {
	return <SeededCard key={args.station} {...args} />;
}

/**
 * The check-in computer's step on the Checklist screen: whether the printing station is checking in,
 * how to start it on a market day, its one-time setup, and what to do when it misbehaves.
 */
const meta = {
	title: 'Admin/Checklist/Printing Station',
	component: Fixture,
	parameters: { shell: 'admin' },
	argTypes: { station: { control: 'inline-radio', options: ['online', 'offline', 'unknown'] } },
	args: { station: 'online' },
} satisfies Meta<typeof Fixture>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The station is up: volunteers' phones can print. */
export const Online: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(await canvas.findByRole('status')).toHaveTextContent(t.online);
		await expect(canvas.getByRole('link', { name: t.open })).toHaveAttribute(
			'href',
			`${window.location.origin}/printing-station`,
		);
	},
};

/** Nobody has the station's page open. */
export const Offline: Story = {
	args: { station: 'offline' },
	play: async ({ canvasElement }) => {
		await expect(await within(canvasElement).findByRole('status')).toHaveTextContent(t.offline);
	},
};

/** A worker who can't ask whether the station is up sees the setup without a status. */
export const Unknown: Story = {
	args: { station: 'unknown' },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByRole('heading', { name: t.title })).toBeVisible();
		await expect(canvas.queryByRole('status')).toBeNull();
	},
};

/** The one-time setup is collapsed; opened, it gives the command that prints through the dialog. */
export const FirstTimeSetup: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByText(printStationLaunchCommand)).toBeVisible();
		await expect(canvas.queryByText(printStationFirstRunCommand)).not.toBeVisible();

		await userEvent.click(canvas.getByText(t.setupTitle));

		await expect(canvas.getByText(printStationFirstRunCommand)).toBeVisible();
		await expect(printStationFirstRunCommand).not.toContain('--kiosk-printing');
		await expect(printStationLaunchCommand).toContain('--kiosk-printing');
	},
};
