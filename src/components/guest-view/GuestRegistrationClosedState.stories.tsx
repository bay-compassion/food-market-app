import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { translations } from '../../locales';
import { Card } from '../ui/layout/Card';
import { GuestRegistrationClosedState } from './GuestRegistrationClosedState';

/**
 * Shown once registration has closed for the day, through both `registration_closed` and
 * `lottery_pending` — a guest only reaches either phase without a visit by missing the window.
 * Wrapped in `Card` for the frame this screen normally sits inside.
 */
const meta = {
	title: 'Guest/Session States/Registration Closed',
	component: GuestRegistrationClosedState,
	parameters: { shell: 'guest' },
	decorators: [
		(Story) => (
			<Card aria-live="polite">
				<Story />
			</Card>
		),
	],
} satisfies Meta<typeof GuestRegistrationClosedState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const RegistrationClosed: Story = {
	play: async ({ canvas }) => {
		await expect(
			canvas.getByRole('heading', {
				name: translations.en.guestView.registrationClosedState.heading,
			}),
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
