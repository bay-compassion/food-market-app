import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { translations } from '../../locales';
import { GuestRegistrationClosedState } from './GuestRegistrationClosedState';
import { ScheduledInThreeDays } from './scheduled-next-registration.fixture';

/**
 * Shown once registration has closed for the day, through `registration_closed`,
 * `lottery_pending` and `service_started` — a guest only reaches any of them without a visit by
 * missing the window. Today's news leads in the warning tone, then when registration opens next,
 * then how a market Saturday runs.
 */
const meta = {
	title: 'Guest/Market Page/Registration Closed',
	component: GuestRegistrationClosedState,
	parameters: { shell: 'guest' },
} satisfies Meta<typeof GuestRegistrationClosedState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const RegistrationClosed: Story = {
	play: async ({ canvas }) => {
		const copy = translations.en.guestView;

		await expect(
			canvas.getByRole('heading', { name: copy.registrationClosedState.heading }),
		).toBeInTheDocument();
		await expect(canvas.getByText(copy.registrationClosedState.headline)).toBeInTheDocument();
		await expect(canvas.getByText(copy.notOpenState.nextLabel)).toBeInTheDocument();
		await expect(
			canvas.getByRole('heading', { name: copy.notOpenState.scheduleHeading }),
		).toBeInTheDocument();
		// Undated, so nothing to put in a calendar.
		await expect(canvas.queryByRole('link')).not.toBeInTheDocument();
		// The guide is the closed market's offer, not this card's.
		await expect(
			canvas.queryByRole('button', { name: translations.en.guestView.presentation.watchShort }),
		).not.toBeInTheDocument();
	},
};

/** With the next session scheduled, the card below names its date and offers Add to Calendar. */
export const Dated: Story = {
	render: () => (
		<ScheduledInThreeDays>
			<GuestRegistrationClosedState />
		</ScheduledInThreeDays>
	),
	play: async ({ canvas }) => {
		await expect(canvas.getByText(/^Opens in 3 days at /)).toBeInTheDocument();
		await expect(
			canvas.getByRole('link', { name: translations.en.guestView.notOpenState.addToCalendar }),
		).toBeInTheDocument();
	},
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	globals: { locale: 'ar' },
	play: async ({ canvas }) => {
		await expect(
			canvas.getByRole('heading', {
				name: translations.ar.guestView.registrationClosedState.heading,
			}),
		).toBeInTheDocument();
	},
};
