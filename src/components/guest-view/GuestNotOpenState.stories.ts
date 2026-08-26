import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed } from 'vue';

import { translations, type Locale } from '../../locales';
import GuestNotOpenState from './GuestNotOpenState.vue';
import GuestSignupCard from './GuestSignupCard.vue';

/**
 * Shown before a `draft` or `scheduled` session's registration window has opened — including when
 * no event has been configured at all. Wrapped in `GuestSignupCard` purely for the `.checkin-card`
 * frame this screen normally sits inside.
 */

type GuestNotOpenStateArgs = {
	locale: Locale;
	showPreregisterCta: boolean;
};

const meta: Meta<GuestNotOpenStateArgs> = {
	title: 'Guest/Session States/Inactive',
	component: GuestNotOpenState,
	parameters: { shell: 'guest' },
	args: {
		locale: 'en',
		showPreregisterCta: false,
	},
	render: (args) => ({
		components: { GuestSignupCard, GuestNotOpenState },
		setup() {
			return { args, t: computed(() => translations[args.locale]) };
		},
		template: `
			<GuestSignupCard>
				<GuestNotOpenState :t="t" :show-preregister-cta="args.showPreregisterCta" />
			</GuestSignupCard>
		`,
	}),
};

export default meta;

type Story = StoryObj<GuestNotOpenStateArgs>;

/** No event exists yet, or it's still `draft`/`scheduled` off the `/signup` route. */
export const NotOpen: Story = {};

/** Same state, but this guest hasn't signed up yet, so a "sign up early" link is offered. */
export const WithPreregisterCta: Story = {
	args: { showPreregisterCta: true },
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	args: { showPreregisterCta: true },
	globals: { locale: 'ar' },
};
