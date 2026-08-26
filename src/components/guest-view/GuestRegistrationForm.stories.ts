import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, ref } from 'vue';

import { translations, type Locale } from '../../locales';
import type { GuestFormState } from '../types';
import GuestRegistrationForm from './GuestRegistrationForm.vue';
import GuestSignupCard from './GuestSignupCard.vue';

/**
 * The registration form itself — before a guest has submitted anything. Wrapped in
 * `GuestSignupCard` because its submission-error rules live in `guest.css`, scoped to
 * `.checkin-card`, and render unstyled without that ancestor.
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

type GuestRegistrationFormArgs = {
	locale: Locale;
	context: 'queue' | 'early';
	isIdentified: boolean;
	askExtraQuestions: boolean;
	submissionError: string;
	isSubmitting: boolean;
	/** `null` hides the countdown; a number shows it closing that many minutes from now. */
	minutesRemaining: number | null;
};

const meta: Meta<GuestRegistrationFormArgs> = {
	title: 'Guest/GuestRegistrationForm',
	component: GuestRegistrationForm,
	parameters: { shell: 'guest' },
	argTypes: {
		context: { control: 'inline-radio', options: ['queue', 'early'] },
	},
	args: {
		locale: 'en',
		context: 'queue',
		isIdentified: false,
		askExtraQuestions: false,
		submissionError: '',
		isSubmitting: false,
		minutesRemaining: null,
	},
	render: (args) => ({
		components: { GuestSignupCard, GuestRegistrationForm },
		setup() {
			const guest = ref<GuestFormState>(emptyGuest());
			const registrationAnswers = ref<Record<string, string | number>>({});
			// A fixed pair, rather than a live-ticking ref, keeps the story stable rather than
			// drifting while it sits open (see `QueueGuestRow.stories.ts` for the same convention).
			const now = Date.now();
			const registrationClosesAt = computed(() =>
				args.minutesRemaining === null ? null : new Date(now + args.minutesRemaining * 60_000),
			);

			return {
				args,
				guest,
				registrationAnswers,
				now,
				registrationClosesAt,
				t: computed(() => translations[args.locale]),
				registrationQuestions: computed(() => (args.askExtraQuestions ? sampleQuestions : [])),
			};
		},
		template: `
			<GuestSignupCard>
				<GuestRegistrationForm
					v-model:guest="guest"
					v-model:registration-answers="registrationAnswers"
					:t="t"
					:context="args.context"
					:is-identified="args.isIdentified"
					:registration-questions="registrationQuestions"
					:submission-error="args.submissionError"
					:is-submitting="args.isSubmitting"
					:now="now"
					:registration-closes-at="registrationClosesAt"
				/>
			</GuestSignupCard>
		`,
	}),
};

export default meta;

type Story = StoryObj<GuestRegistrationFormArgs>;

/** Registration open, not yet identified: sign-up and lottery-entry fields together. */
export const RegistrationForm: Story = {};

/** Registration open, already identified: only the lottery-entry fields — nothing to re-ask. */
export const IdentifiedGuest: Story = {
	args: { isIdentified: true },
};

/** Registration open, with the closing countdown showing above the form title. */
export const RegistrationClosingSoon: Story = {
	args: { minutesRemaining: 5 },
};

/** Registration questions configured in the admin question bank appear at the end of the form. */
export const WithRegistrationQuestions: Story = {
	args: { askExtraQuestions: true },
};

/** The form as it appears while the submission request is in flight. */
export const Submitting: Story = {
	args: { isSubmitting: true },
};

/** A failed submission. The error sits directly above the submit button. */
export const SubmissionFailed: Story = {
	args: { submissionError: translations.en.submissionError },
};

/** The `early` context: signing up ahead of the market — identity only, no lottery fields. */
export const EarlySignupForm: Story = {
	args: { context: 'early' },
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	globals: { locale: 'ar' },
};
