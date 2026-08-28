import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed } from 'vue';

import { translations, type Locale } from '../../locales';
import Card from '../ui/layout/Card.vue';
import GuestServiceState from './GuestServiceState.vue';

/**
 * Shown to a guest without an active visit while the market is `service_started` or `ended`.
 * Wrapped in `Card` for the frame this screen normally sits inside.
 */

type GuestServiceStateArgs = {
	locale: Locale;
	hasEnded: boolean;
};

const meta: Meta<GuestServiceStateArgs> = {
	title: 'Guest/GuestServiceState',
	component: GuestServiceState,
	parameters: { shell: 'guest' },
	args: {
		locale: 'en',
		hasEnded: false,
	},
	render: (args) => ({
		components: { Card, GuestServiceState },
		setup() {
			return { args, t: computed(() => translations[args.locale]) };
		},
		template: `
			<Card aria-live="polite">
				<GuestServiceState :t="t" :has-ended="args.hasEnded" />
			</Card>
		`,
	}),
};

export default meta;

type Story = StoryObj<GuestServiceStateArgs>;

/** The market is underway right now, but this guest never registered. */
export const InProgress: Story = {};

/** The market has ended for the day. */
export const Ended: Story = {
	args: { hasEnded: true },
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	globals: { locale: 'ar' },
};
