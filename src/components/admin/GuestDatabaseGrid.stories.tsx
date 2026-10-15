import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import type { Locale } from '../../locales';
import { GuestDatabaseRows } from '../../models/guest-database-rows';
import { adminVisitStatusLabels } from '../../services/visitStatusLabels';
import { GuestDatabaseGrid } from './GuestDatabaseGrid';
import { busyQueue } from './queueGuests.fixture';
import type { DatabaseGuest } from './types';

/**
 * Every guest on record, as the guest database shows them on a desk.
 *
 * The whole list is already in memory when this renders, so sorting and filtering happen here
 * rather than as a round trip to the server. Searching and the quick filters belong to the screen
 * around the grid (`Admin/Guest Database/Database View`), which hands it the rows they leave.
 * Row grouping is deliberately absent: it is a Data Grid Premium feature, and the status and
 * language filters cover the same ground here.
 */
type GuestDatabaseGridArgs = {
	locale: Locale;
	busy: boolean;
	canExport: boolean;
	guests: DatabaseGuest[];
};

function Grid({ locale, busy, canExport, guests }: GuestDatabaseGridArgs) {
	const rows = new GuestDatabaseRows(
		guests,
		adminVisitStatusLabels(locale),
		adminTranslations.en.noVisit,
	);

	return (
		<GuestDatabaseGrid
			rows={rows}
			shown={rows.rows}
			canExport={canExport}
			busy={busy}
			onRun={fn()}
		/>
	);
}

const meta = {
	title: 'Admin/Guest Database/Guest Grid',
	component: Grid,
	parameters: { shell: 'admin' },
	// The grid is the desk form of the guest database; a phone gets the list instead.
	globals: { viewport: { value: 'ipad12p', isRotated: false } },
	args: { locale: 'en', busy: false, canExport: true, guests: busyQueue },
} satisfies Meta<typeof Grid>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The default view: every guest, sorted by name. */
export const AllGuests: Story = {};

/**
 * Guests who have never had a visit — saved between sessions by a worker, or through `/signup` —
 * are listed too. Their status (a column hidden by default) reads "No visit", and their Actions
 * menu has no queue command in it — only dialling them, and for a manager the QR code.
 */
export const WithGuestsWhoHaveNoVisit: Story = {
	args: {
		guests: [
			...busyQueue,
			{
				id: null,
				guestId: 'guest-without-visit',
				firstName: 'Ana',
				lastName: 'Reyes',
				pronunciation: null,
				staffNotes: null,
				phone: '(555) 987-6543',
				locale: 'tl',
				householdSize: null,
				queuePosition: null,
				priorityNumber: null,
				queueFront: null,
				queueOrder: null,
				calledAt: null,
				status: null,
				marketEventId: null,
			},
		],
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const row = (await canvas.findByText('Ana Reyes')).closest('[role="row"]')!;

		await userEvent.click(within(row as HTMLElement).getByRole('button'));
		// The menu renders in a portal; with no visit and no manager permission, only the dial remains.
		const items = await within(document.body).findAllByRole('menuitem');

		await expect(items).toHaveLength(1);
		await expect(items[0]).toHaveTextContent(adminTranslations.en.phoneGuest);
	},
};

/** No guests on record yet — the grid falls back to its empty state. */
export const NoGuests: Story = {
	args: { guests: [] },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.getByText(adminTranslations.en.noGuests)).toBeInTheDocument();
	},
};

/** A command is in flight: the grid greys out while the actions are unavailable. */
export const Busy: Story = {
	args: { busy: true },
};

/**
 * A worker who may run the queue but not `export:guest-data`. The toolbar keeps its columns and
 * filter controls and loses the export menu, so guest names and phone numbers stay on
 * the screen they were loaded for.
 */
export const WithoutExportPermission: Story = {
	args: { canExport: false },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(canvas.queryByRole('button', { name: /export/i })).not.toBeInTheDocument();
		await expect(canvas.getByRole('button', { name: /filters/i })).toBeInTheDocument();
	},
};
