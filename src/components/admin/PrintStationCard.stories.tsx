import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, within } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import { AdminApi } from '../../services/admin-api';
import type { Permission } from '../../services/permissions';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
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
 * On the Current Session screen: how to set up the computer the label printer is plugged into,
 * the way to open its page, and whether it is checking in right now.
 */
const meta = {
	title: 'Admin/Current Session/Printing Station',
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
