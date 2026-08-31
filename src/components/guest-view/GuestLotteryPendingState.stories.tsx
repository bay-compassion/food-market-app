import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { translations } from '../../locales';
import { Card } from '../ui/layout/Card';
import { GuestLotteryPendingState } from './GuestLotteryPendingState';

/** Shown after the registration pool is frozen and before the lottery is drawn. */
const meta = {
	title: 'Guest/Session States/Lottery Pending',
	component: GuestLotteryPendingState,
	parameters: { shell: 'guest' },
	decorators: [
		(Story) => (
			<Card aria-live="polite">
				<Story />
			</Card>
		),
	],
} satisfies Meta<typeof GuestLotteryPendingState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LotteryPending: Story = {
	play: async ({ canvas }) => {
		await expect(
			canvas.getByRole('heading', {
				name: translations.en.guestView.lotteryPendingState.heading,
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
				name: translations.ar.guestView.lotteryPendingState.heading,
			}),
		).toBeInTheDocument();
	},
};
