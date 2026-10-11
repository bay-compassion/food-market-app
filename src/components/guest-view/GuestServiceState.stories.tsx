import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { translations } from '../../locales';
import { GuestServiceState } from './GuestServiceState';
import { GuestStatusCard } from './GuestStatusCard';

/**
 * Shown when there is no current-market visit to present and the market is underway. Wrapped in
 * `GuestStatusCard` for the frame this screen normally sits inside.
 */
const meta = {
	title: 'Guest/GuestServiceState',
	component: GuestServiceState,
	parameters: { shell: 'guest' },
	decorators: [
		(Story) => (
			<GuestStatusCard>
				<Story />
			</GuestStatusCard>
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
		await expect(canvas.getByText(copy.inProgressDescription)).toBeInTheDocument();
	},
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	globals: { locale: 'ar' },
};
