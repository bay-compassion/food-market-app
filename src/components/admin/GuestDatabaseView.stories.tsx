import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import type { Locale } from '../../locales';
import { manualAdmissionsFor, type ManualAdmission } from '../../services/guestAdmission';
import { adminVisitStatusLabels } from '../../services/visitStatusLabels';
import { GuestDatabaseView } from './GuestDatabaseView';

/**
 * The guest database screen's shell: its heading, the control for adding a guest by hand, and the
 * grid beneath them.
 *
 * The grid reads its rows from the root store, which a story does not seed, so it shows its empty
 * state here — `Admin/GuestDatabaseGrid` is where the rows themselves are reviewed. What this
 * covers is the frame around it, and in particular that "Add guest" sits in the heading rather
 * than below the list, where a worker would have to scroll every guest on record to reach it.
 */
type GuestDatabaseViewArgs = {
	locale: Locale;
	admissions: ManualAdmission[];
};

function View({ locale, admissions }: GuestDatabaseViewArgs) {
	return (
		<GuestDatabaseView
			statusLabels={adminVisitStatusLabels(locale)}
			admissions={admissions}
			onRun={fn()}
			onAddGuest={fn()}
		/>
	);
}

const meta = {
	title: 'Admin/GuestDatabaseView',
	component: View,
	parameters: { shell: 'admin' },
	args: { locale: 'en', admissions: manualAdmissionsFor('service_started') },
} satisfies Meta<typeof View>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A session that can still take a guest: the heading carries the button for adding one. */
export const WithAddGuest: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const heading = canvas.getByRole('heading', { name: adminTranslations.en.allGuests });
		const addGuest = canvas.getByRole('button', {
			name: new RegExp(adminTranslations.en.addGuest),
		});

		// Same row as the title, not somewhere below the grid.
		await expect(heading.parentElement).toContainElement(addGuest);
	},
};

/**
 * No session is configured. A guest can still be added — their details alone, with no visit — so
 * the button stays, and the database itself stays readable.
 */
export const BetweenSessions: Story = {
	args: { admissions: manualAdmissionsFor(null) },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await expect(
			canvas.getByRole('button', { name: new RegExp(adminTranslations.en.addGuest) }),
		).toBeInTheDocument();
		await expect(canvas.getByText(adminTranslations.en.noGuests)).toBeInTheDocument();
	},
};
