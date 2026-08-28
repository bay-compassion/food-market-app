import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { expect } from 'storybook/test';
import { computed } from 'vue';

import { translations, type Locale } from '../../locales';
import Card from '../ui/layout/Card.vue';
import GuestNotOpenState from './GuestNotOpenState.vue';

/**
 * Shown before a `draft` or `scheduled` session's registration window has opened — including when
 * no event has been configured at all. Wrapped in `Card` for the frame this screen normally sits
 * inside.
 */

type GuestNotOpenStateArgs = {
	locale: Locale;
};

const meta: Meta<GuestNotOpenStateArgs> = {
	title: 'Guest/Session States/Inactive',
	component: GuestNotOpenState,
	parameters: { shell: 'guest' },
	args: {
		locale: 'en',
	},
	render: (args) => ({
		components: { Card, GuestNotOpenState },
		setup() {
			return { args, t: computed(() => translations[args.locale]) };
		},
		template: `
			<Card aria-live="polite">
				<GuestNotOpenState :t="t" />
			</Card>
		`,
	}),
};

export default meta;

type Story = StoryObj<GuestNotOpenStateArgs>;

/** No event exists yet, or it's still `draft`/`scheduled` off the `/signup` route. */
export const NotOpen: Story = {
	play: async ({ canvas }) => {
		const copy = translations.en.guestView.notOpenState;

		await expect(canvas.getByRole('heading', { name: copy.heading })).toBeInTheDocument();
		await expect(canvas.getByText(copy.subheading)).toBeInTheDocument();
		await expect(canvas.getByText(copy.lotteryDescription)).toBeInTheDocument();
		await expect(canvas.getByText(copy.selectionDescription)).toBeInTheDocument();
		await expect(canvas.queryByRole('link')).not.toBeInTheDocument();
		await expect(canvas.queryByRole('button')).not.toBeInTheDocument();
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
