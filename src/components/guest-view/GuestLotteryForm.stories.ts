import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { expect } from 'storybook/test';
import { computed, ref } from 'vue';

import { translations, type Locale } from '../../locales';
import type { GuestFormState } from '../types';
import Card from '../ui/layout/Card.vue';
import GuestLotteryForm from './GuestLotteryForm.vue';

/**
 * The lottery-entry fields — age range, household composition, and any per-session registration
 * questions. Wrapped in `Card` for the frame this screen normally sits inside.
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

const sampleQuestions = [
	{
		id: 'q-transport',
		prompt: 'How did you travel here today?',
		type: 'text' as const,
		required: false,
	},
	{ id: 'q-rating', prompt: 'How easy was it to sign up?', type: 'scale' as const, required: true },
];

type GuestLotteryFormArgs = {
	locale: Locale;
	askExtraQuestions: boolean;
};

const meta: Meta<GuestLotteryFormArgs> = {
	title: 'Guest/GuestLotteryForm',
	component: GuestLotteryForm,
	parameters: { shell: 'guest' },
	args: { locale: 'en', askExtraQuestions: false },
	render: (args) => ({
		components: { Card, GuestLotteryForm },
		setup() {
			const guest = ref<GuestFormState>(emptyGuest());
			const registrationAnswers = ref<Record<string, string | number>>({});

			return {
				guest,
				registrationAnswers,
				t: translations[args.locale],
				registrationQuestions: computed(() => (args.askExtraQuestions ? sampleQuestions : [])),
			};
		},
		template: `
			<Card aria-live="polite">
				<form>
					<GuestLotteryForm
						v-model:guest="guest"
						v-model:registration-answers="registrationAnswers"
						:t="t"
						:registration-questions="registrationQuestions"
					/>
				</form>
			</Card>
		`,
	}),
};

export default meta;

type Story = StoryObj<GuestLotteryFormArgs>;

/** The lottery-entry fields on their own. */
export const Default: Story = {
	play: async ({ canvas }) => {
		await expect(canvas.getByLabelText(translations.en.age)).toBeInTheDocument();
		await expect(
			canvas.getByRole('group', { name: translations.en.household }),
		).toBeInTheDocument();
	},
};

/** Registration questions configured in the admin question bank appear at the end of the form. */
export const WithRegistrationQuestions: Story = {
	args: { askExtraQuestions: true },
	play: async ({ canvas }) => {
		await expect(canvas.getByText(sampleQuestions[0]!.prompt)).toBeInTheDocument();
	},
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	globals: { locale: 'ar' },
	play: async ({ canvas }) => {
		await expect(canvas.getByLabelText(translations.ar.age)).toBeInTheDocument();
	},
};
