import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed } from 'vue';

import { translations, type Locale } from '../../locales';
import GuestRegistrationClosedState from './GuestRegistrationClosedState.vue';
import GuestSignupCard from './GuestSignupCard.vue';

/**
 * Shown once registration has closed for the day, before the lottery runs. Wrapped in
 * `GuestSignupCard` purely for the `.checkin-card` frame this screen normally sits inside.
 */

type GuestRegistrationClosedStateArgs = {
	locale: Locale;
};

const meta: Meta<GuestRegistrationClosedStateArgs> = {
	title: 'Guest/Session States/Registration Closed',
	component: GuestRegistrationClosedState,
	parameters: { shell: 'guest' },
	args: {
		locale: 'en',
	},
	render: (args) => ({
		components: { GuestSignupCard, GuestRegistrationClosedState },
		setup() {
			return { args, t: computed(() => translations[args.locale]) };
		},
		template: `
			<GuestSignupCard>
				<GuestRegistrationClosedState :t="t" />
			</GuestSignupCard>
		`,
	}),
};

export default meta;

type Story = StoryObj<GuestRegistrationClosedStateArgs>;

export const RegistrationClosed: Story = {};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	globals: { locale: 'ar' },
};
