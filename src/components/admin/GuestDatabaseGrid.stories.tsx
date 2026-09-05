import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import type { Locale } from '../../locales';
import { adminVisitStatusLabels } from '../../services/visitStatusLabels';
import { GuestDatabaseGrid } from './GuestDatabaseGrid';
import { busyQueue } from './queueGuests.fixture';
import type { QueueGuest } from './types';

/**
 * Every guest on record.
 *
 * The whole list is already in memory when this renders, so the toolbar owns searching, sorting
 * and filtering rather than a round trip to the server. Row grouping is deliberately absent: it is
 * a Data Grid Premium feature, and the status and language filters cover the same ground here.
 */
type GuestDatabaseGridArgs = {
	locale: Locale;
	busy: boolean;
	canExport: boolean;
	guests: QueueGuest[];
};

function Grid({ locale, busy, canExport, guests }: GuestDatabaseGridArgs) {
	return (
		<GuestDatabaseGrid
			guests={guests}
			statusLabels={adminVisitStatusLabels(locale)}
			canExport={canExport}
			busy={busy}
			onRun={fn()}
		/>
	);
}

const meta = {
	title: 'Admin/GuestDatabaseGrid',
	component: Grid,
	parameters: { shell: 'admin' },
	args: { locale: 'en', busy: false, canExport: true, guests: busyQueue },
} satisfies Meta<typeof Grid>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The default view: every guest, sorted by name. */
export const AllGuests: Story = {};

/** Typing in the toolbar's search narrows the grid to the matching guests. */
export const SearchNarrowsTheGrid: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await userEvent.type(canvas.getByRole('searchbox'), 'Nguyen');

		// The toolbar's search debounces, so the grid narrows a moment after the last keystroke.
		await waitFor(() => expect(canvas.queryByText('Maria Santos')).not.toBeInTheDocument());
		await expect(canvas.getByText('Linh Nguyen')).toBeInTheDocument();
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
 * A worker who may run the queue but not `export:guest-data`. The toolbar keeps its columns,
 * filter and search controls and loses the export menu, so guest names and phone numbers stay on
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
