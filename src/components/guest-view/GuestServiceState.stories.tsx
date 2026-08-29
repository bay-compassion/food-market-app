import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { translations } from '../../locales';
import { Card } from '../ui/layout/Card';
import { GuestServiceState } from './GuestServiceState';

/**
 * Shown to a guest without an active visit while the market is `service_started` or `ended`.
 * Wrapped in `Card` for the frame this screen normally sits inside.
 */
const meta = {
	title: 'Guest/GuestServiceState',
	component: GuestServiceState,
	parameters: { shell: 'guest' },
	args: { hasEnded: false },
	decorators: [
		(Story) => (
			<Card aria-live="polite">
				<Story />
			</Card>
		),
	],
} satisfies Meta<typeof GuestServiceState>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The market is underway right now, but this guest never registered. */
export const InProgress: Story = {
	play: async ({ canvas }) => {
		const copy = translations.en.guestView.serviceState;

		await expect(canvas.getByRole('heading', { name: copy.inProgressHeading })).toBeInTheDocument();
		// Nothing to come back for while the market is running, so no schedule details.
		await expect(canvas.queryByText(copy.endedDescription)).not.toBeInTheDocument();
	},
};

/** The market has ended for the day. */
export const Ended: Story = {
	args: { hasEnded: true },
	play: async ({ canvas, canvasElement }) => {
		await expect(
			canvas.getByRole('heading', { name: translations.en.guestView.serviceState.endedHeading }),
		).toBeInTheDocument();
		// Once it has ended, when the market next opens is the useful next step.
		await expect(canvasElement.querySelector('.schedule-details')).toBeInTheDocument();
	},
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	globals: { locale: 'ar' },
};
