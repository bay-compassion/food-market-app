import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { expect } from 'storybook/test';
import { ref } from 'vue';

import { translations, type Locale } from '../../locales';
import type { GuestFormState } from '../types';
import Card from '../ui/layout/Card.vue';
import GuestSignupForm from './GuestSignupForm.vue';

/**
 * The identity-only fields — first name, last name, phone — shared by the standalone early
 * sign-up screen and the combined registration-open form. Wrapped in `Card` for the frame this
 * screen normally sits inside.
 */

const emptyGuest = (): GuestFormState => ({
	firstName: '',
	lastName: '',
	ageRange: '',
	householdSize: '',
	childrenCount: '',
	seniorsCount: '',
	phone: '',
});

type GuestSignupFormArgs = {
	locale: Locale;
};

const meta: Meta<GuestSignupFormArgs> = {
	title: 'Guest/GuestSignupForm',
	component: GuestSignupForm,
	parameters: { shell: 'guest' },
	args: { locale: 'en' },
	render: (args) => ({
		components: { Card, GuestSignupForm },
		setup() {
			const guest = ref<GuestFormState>(emptyGuest());

			return { guest, t: translations[args.locale] };
		},
		template: `
			<Card aria-live="polite">
				<form>
					<GuestSignupForm v-model:guest="guest" :t="t" />
				</form>
			</Card>
		`,
	}),
};

export default meta;

type Story = StoryObj<GuestSignupFormArgs>;

/** The identity fields on their own. */
export const Default: Story = {
	play: async ({ canvas }) => {
		await expect(canvas.getByLabelText(translations.en.firstName)).toBeInTheDocument();
		await expect(canvas.getByLabelText(translations.en.lastName)).toBeInTheDocument();
		await expect(canvas.getByLabelText(translations.en.phone)).toBeInTheDocument();
	},
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	globals: { locale: 'ar' },
	play: async ({ canvas }) => {
		await expect(canvas.getByLabelText(translations.ar.firstName)).toBeInTheDocument();
	},
};
