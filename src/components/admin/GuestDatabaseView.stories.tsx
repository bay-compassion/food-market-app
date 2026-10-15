import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import type { Locale } from '../../locales';
import type { AdminApi } from '../../services/admin-api';
import { manualAdmissionsFor, type ManualAdmission } from '../../services/guestAdmission';
import { adminVisitStatusLabels } from '../../services/visitStatusLabels';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
import { ConfirmationDrawer } from '../ui/ConfirmationDrawer';
import { GuestDatabaseView } from './GuestDatabaseView';
import { busyQueue } from './queueGuests.fixture';
import type { DatabaseGuest } from './types';

const t = adminTranslations.en;

/**
 * The guest database screen: search and the quick filters over the list, and the button for
 * adding a guest by hand beside the search, where a worker meets it before scrolling every guest
 * on record.
 *
 * On a phone the guests are a list of rows; on a desk they are the full grid, whose own stories
 * (`Admin/Guest Database/Guest Grid`) cover sorting, the filter panel, and export. The screen reads
 * its guests from the root store, so each story builds a store whose admin API answers with
 * `guests` rather than replacing `window.fetch`, which every story on a docs page would share.
 */
type GuestDatabaseViewArgs = {
	locale: Locale;
	admissions: ManualAdmission[];
	guests: DatabaseGuest[];
};

function View({ locale, admissions, guests }: GuestDatabaseViewArgs) {
	const [store] = useState(() => {
		const api = { listAllGuests: () => Promise.resolve(guests) } as unknown as AdminApi;
		const created = new RootStore({ admin: { api } });

		void created.admin.refreshGuests();

		return created;
	});

	return (
		<RootStoreProvider store={store}>
			<GuestDatabaseView
				statusLabels={adminVisitStatusLabels(locale)}
				admissions={admissions}
				onRun={fn()}
				onAddGuest={fn()}
			/>
			<ConfirmationDrawer />
		</RootStoreProvider>
	);
}

const meta = {
	title: 'Admin/Guest Database/Database View',
	component: View,
	parameters: { shell: 'admin' },
	args: { locale: 'en', admissions: manualAdmissionsFor('service_started'), guests: busyQueue },
} satisfies Meta<typeof View>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A phone: one row per guest, with the Add Guest button beside the search. */
export const OnAPhone: Story = {
	play: async ({ canvas }) => {
		const list = within(await canvas.findByRole('list', { name: t.allGuests }));

		await expect(list.getAllByRole('listitem')).toHaveLength(busyQueue.length);
		await expect(canvas.getByRole('button', { name: t.addGuest })).toBeVisible();
	},
};

/** Searching matches a name, or a phone number by its digits. */
export const SearchNarrowsTheList: Story = {
	play: async ({ canvas }) => {
		await canvas.findByRole('list', { name: t.allGuests });
		await userEvent.type(canvas.getByRole('searchbox', { name: t.searchGuests }), 'nguyen');

		const list = within(canvas.getByRole('list', { name: t.allGuests }));

		await expect(list.getAllByRole('listitem')).toHaveLength(1);
		await expect(list.getByText('Linh Nguyen')).toBeVisible();
	},
};

/** A quick filter narrows the list to one kind of guest. */
export const QuickFilter: Story = {
	args: {
		guests: busyQueue.map((guest, index) =>
			index === 0 ? { ...guest, status: 'not_placed' as const } : guest,
		),
	},
	play: async ({ canvas }) => {
		await canvas.findByRole('list', { name: t.allGuests });

		const filters = within(canvas.getByRole('group', { name: t.guestFilterLabel }));

		await userEvent.click(filters.getByRole('button', { name: t.guestFilters['not-placed'] }));
		await expect(
			filters.getByRole('button', { name: t.guestFilters['not-placed'] }),
		).toHaveAttribute('aria-pressed', 'true');
		await expect(
			within(canvas.getByRole('list', { name: t.allGuests })).getAllByRole('listitem'),
		).toHaveLength(1);
	},
};

/** On a desk the same search drives the full grid. */
export const OnADesk: Story = {
	globals: { viewport: { value: 'ipad12p', isRotated: false } },
	play: async ({ canvas }) => {
		await canvas.findByText('Linh Nguyen');
		await userEvent.type(canvas.getByRole('searchbox', { name: t.searchGuests }), 'nguyen');
		await waitFor(() => expect(canvas.queryByText('Maria Santos')).not.toBeInTheDocument());
		await expect(canvas.getByRole('grid')).toHaveTextContent('Linh Nguyen');
	},
};

/**
 * No session is configured. A guest can still be added — their details alone, with no visit — so
 * the button stays, and the database itself stays readable.
 */
export const BetweenSessions: Story = {
	args: { admissions: manualAdmissionsFor(null), guests: [] },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('button', { name: t.addGuest })).toBeInTheDocument();
		await expect(await canvas.findByText(t.noGuests)).toBeInTheDocument();
	},
};
