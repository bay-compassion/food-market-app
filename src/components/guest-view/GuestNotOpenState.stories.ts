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
	allowPreregister: boolean;
};

const meta: Meta<GuestNotOpenStateArgs> = {
	title: 'Guest/Session States/Inactive',
	component: GuestNotOpenState,
	parameters: { shell: 'guest' },
	args: {
		locale: 'en',
		allowPreregister: true,
	},
	render: (args) => ({
		components: { Card, GuestNotOpenState },
		setup() {
			return { args, t: computed(() => translations[args.locale]) };
		},
		template: `
			<Card aria-live="polite">
				<GuestNotOpenState :t="t" :allow-preregister="args.allowPreregister" />
			</Card>
		`,
	}),
};

export default meta;

type Story = StoryObj<GuestNotOpenStateArgs>;

/**
 * No event exists yet, or it's still `draft`/`scheduled`, seen from a route other than `/signup` —
 * so the state offers a way through to pre-registration.
 */
export const NotOpen: Story = {
	play: async ({ canvas }) => {
		const copy = translations.en.guestView.notOpenState;

		await expect(canvas.getByRole('heading', { name: copy.heading })).toBeInTheDocument();
		await expect(canvas.getByText(copy.subheading)).toBeInTheDocument();
		await expect(canvas.getByText(copy.lotteryDescription)).toBeInTheDocument();
		await expect(canvas.getByText(copy.selectionDescription)).toBeInTheDocument();
		await expect(canvas.queryByRole('link')).not.toBeInTheDocument();
		await expect(
			await canvas.findByRole('button', { name: copy.preregisterAction }),
		).toBeInTheDocument();
	},
};

/**
 * The same state on `/signup` itself, where the pre-registration button would only lead back to
 * the page the guest is already on.
 */
export const NotOpenOnSignup: Story = {
	args: { allowPreregister: false },
	play: async ({ canvas }) => {
		const copy = translations.en.guestView.notOpenState;

		await expect(canvas.getByRole('heading', { name: copy.heading })).toBeInTheDocument();
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
