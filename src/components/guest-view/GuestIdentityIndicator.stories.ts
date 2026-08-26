import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { expect } from 'storybook/test';

import { translations, type Locale } from '../../locales';
import type { GuestIdentity } from '../../services/guest.store';
import GuestIdentityIndicator from './GuestIdentityIndicator.vue';

type GuestIdentityIndicatorArgs = {
	locale: Locale;
	identity: GuestIdentity;
};

const meta: Meta<GuestIdentityIndicatorArgs> = {
	title: 'Guest/Identity Indicator',
	component: GuestIdentityIndicator,
	tags: ['autodocs'],
	parameters: {
		shell: 'guest',
		docs: {
			description: {
				component:
					'Indicates that this browser has identified a guest. It displays only the name and phone number saved in client-side storage and never retrieves guest profile data from the server.',
			},
		},
	},
	args: {
		locale: 'en',
		identity: {
			firstName: 'Ari',
			lastName: 'Guest',
			phone: '(555) 123-4567',
		},
	},
	render: (args) => ({
		components: { GuestIdentityIndicator },
		setup() {
			return { args, t: translations[args.locale] };
		},
		template: '<GuestIdentityIndicator :identity="args.identity" :t="t" />',
	}),
};

export default meta;
type Story = StoryObj<GuestIdentityIndicatorArgs>;

export const Default: Story = {
	play: async ({ canvas }) => {
		await expect(
			canvas.getByText(translations.en.guestView.identityIndicator.heading),
		).toBeInTheDocument();
		await expect(canvas.getByText('Ari G')).toBeInTheDocument();
		await expect(canvas.getByText('(555) 123-4567')).toBeInTheDocument();
	},
};

/** Right-to-left rendering for Arabic and Farsi locales. */
export const RightToLeft: Story = {
	globals: { locale: 'ar' },
	play: async ({ canvas }) => {
		await expect(
			canvas.getByText(translations.ar.guestView.identityIndicator.heading),
		).toBeInTheDocument();
		await expect(canvas.getByText('Ari G')).toBeInTheDocument();
		await expect(canvas.getByText('(555) 123-4567')).toBeInTheDocument();
	},
};
