import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { translations } from '../../locales';
import { GuestNotOpenState } from './GuestNotOpenState';
import { GuestStatusCard } from './GuestStatusCard';

/**
 * Shown before a `draft` or `scheduled` session's registration window has opened — including when
 * no event has been configured at all. Wrapped in `GuestStatusCard` for the frame this screen
 * normally sits inside.
 */
const meta = {
	title: 'Guest/Market Page/Not Open',
	component: GuestNotOpenState,
	parameters: { shell: 'guest' },
	decorators: [
		(Story) => (
			<GuestStatusCard>
				<Story />
			</GuestStatusCard>
		),
	],
} satisfies Meta<typeof GuestNotOpenState>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * No event exists yet, or it's still `draft`/`scheduled`, so the state explains the next market
 * and how its lottery works.
 */
export const NotOpen: Story = {
	play: async ({ canvas }) => {
		const copy = translations.en.guestView.notOpenState;

		await expect(canvas.getByRole('heading', { name: copy.heading })).toBeInTheDocument();
		await expect(canvas.getByText(copy.subheading)).toBeInTheDocument();
		await expect(canvas.getByText(copy.lotteryDescription)).toBeInTheDocument();
		await expect(canvas.getByText(copy.selectionDescription)).toBeInTheDocument();
		// The guide opens inside the app; the card's only link is still its help link.
		await expect(canvas.getByRole('link')).toHaveAccessibleName(translations.en.help.title);
		await expect(
			canvas.getByRole('button', { name: translations.en.guestView.presentation.watch }),
		).toBeInTheDocument();
		await expect(canvas.getByRole('separator')).toBeInTheDocument();
	},
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	globals: { locale: 'ar' },
	play: async ({ canvas }) => {
		const copy = translations.ar.guestView.notOpenState;

		await expect(canvas.getByRole('heading', { name: copy.heading })).toBeInTheDocument();
		await expect(canvas.getByText(copy.subheading)).toBeInTheDocument();
		await expect(canvas.getByText(copy.lotteryDescription)).toBeInTheDocument();
		await expect(canvas.getByText(copy.selectionDescription)).toBeInTheDocument();
	},
};
