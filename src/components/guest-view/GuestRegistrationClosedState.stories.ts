import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed } from 'vue';

import { translations, type Locale } from '../../locales';
import Card from '../ui/layout/Card.vue';
import GuestRegistrationClosedState from './GuestRegistrationClosedState.vue';

/**
 * Shown once registration has closed for the day, before the lottery runs. Wrapped in `Card` for
 * the frame this screen normally sits inside.
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
		components: { Card, GuestRegistrationClosedState },
		setup() {
			return { args, t: computed(() => translations[args.locale]) };
		},
		template: `
			<Card aria-live="polite">
				<GuestRegistrationClosedState :t="t" />
			</Card>
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
