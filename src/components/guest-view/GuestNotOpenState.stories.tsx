import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { translations } from '../../locales';
import { GuestNotOpenState } from './GuestNotOpenState';
import { ScheduledInThreeDays } from './scheduled-next-registration.fixture';

/**
 * Shown before a `draft` or `scheduled` session's registration window has opened — including when
 * no event has been configured at all. The status card leads, then how a market Saturday runs.
 */
const meta = {
	title: 'Guest/Market Page/Not Open',
	component: GuestNotOpenState,
	parameters: { shell: 'guest' },
} satisfies Meta<typeof GuestNotOpenState>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * No event exists yet, or it's still `draft`/`scheduled`, so the state leads with when registration
 * opens again, then lays out a market Saturday as a timeline.
 */
export const NotOpen: Story = {
	play: async ({ canvas }) => {
		const copy = translations.en.guestView.notOpenState;

		await expect(canvas.getByRole('heading', { name: copy.heading })).toBeInTheDocument();
		await expect(canvas.getByText(copy.nextLabel)).toBeInTheDocument();
		await expect(canvas.getByRole('heading', { name: copy.scheduleHeading })).toBeInTheDocument();
		await expect(canvas.getAllByRole('listitem')).toHaveLength(copy.steps.length);
		await expect(canvas.getByText(copy.supplyNote)).toBeInTheDocument();
		// The guide opens inside the app, so the card links nowhere.
		await expect(canvas.queryByRole('link')).not.toBeInTheDocument();
		await expect(
			canvas.getByRole('button', { name: translations.en.guestView.presentation.watchShort }),
		).toBeInTheDocument();
	},
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	globals: { locale: 'ar' },
	play: async ({ canvas }) => {
		const copy = translations.ar.guestView.notOpenState;

		await expect(canvas.getByRole('heading', { name: copy.heading })).toBeInTheDocument();
		await expect(canvas.getByText(copy.nextLabel)).toBeInTheDocument();
		await expect(canvas.getByText(copy.steps[0]!.title)).toBeInTheDocument();
		await expect(canvas.getByText(copy.supplyNote)).toBeInTheDocument();
	},
};

/**
 * With the next session scheduled, the copy names its date and how far off it is — "in 3 days, on
 * Saturday, October 31" — rather than "next Saturday", which reads as a day or a week away. The
 * guides and videos keep "next Saturday", since they are watched on any day.
 */
export const Dated: Story = {
	render: () => (
		<ScheduledInThreeDays>
			<GuestNotOpenState />
		</ScheduledInThreeDays>
	),
	play: async ({ canvas }) => {
		await expect(canvas.getByText(/^Opens in 3 days at /)).toBeInTheDocument();
		// A dated window can go in the guest's calendar; the undated ones above offer no link.
		await expect(
			canvas.getByRole('link', { name: translations.en.guestView.notOpenState.addToCalendar }),
		).toHaveAttribute('download', 'bay-compassion-registration.ics');
	},
};
