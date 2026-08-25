import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, ref } from 'vue';

import { translations, type Locale } from '../../locales';
import type { GuestFormState } from '../types';
import GuestRegistrationForm from './GuestRegistrationForm.vue';
import GuestSignupCard from './GuestSignupCard.vue';

/**
 * The registration form itself — before a guest has submitted anything. Wrapped in
 * `GuestSignupCard` because several of its rules — `.submission-error`, `.update-profile-option`
 * — live in `guest.css` scoped to `.checkin-card`, and render unstyled without that ancestor.
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
		askExtraQuestions: false,
		submissionError: '',
		isSubmitting: false,
		minutesRemaining: null,
	},
	render: (args) => ({
		components: { GuestSignupCard, GuestRegistrationForm },
		setup() {
			const guest = ref<GuestFormState>(emptyGuest());
			const pin = ref('');
			const pinConfirmation = ref('');
			const registrationType = ref<'new' | 'returning'>('new');
			const updateProfile = ref(false);
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
				pin,
				pinConfirmation,
				registrationType,
				updateProfile,
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
					v-model:pin="pin"
					v-model:pin-confirmation="pinConfirmation"
					v-model:registration-type="registrationType"
					v-model:update-profile="updateProfile"
					v-model:registration-answers="registrationAnswers"
					:t="t"
					:context="args.context"
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

/** A guest arriving for the first time, with registration open. */
export const NewGuestForm: Story = {};

/** Registration open, with the closing countdown showing above the form title. */
export const RegistrationClosingSoon: Story = {
	args: { minutesRemaining: 5 },
};

/**
 * A returning guest. The name and household fields collapse away — they are already on file — and
 * only the phone number and PIN are asked for.
 */
export const ReturningGuestForm: Story = {
	play: async ({ canvas, userEvent }) => {
		// Matched against the translation rather than a hard-coded string, so rewording the label in
		// `locales.ts` does not quietly break this story.
		const label = new RegExp(translations.en.returningGuest, 'i');

		await userEvent.click(await canvas.findByRole('button', { name: label }));
	},
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

/** The `early` context: signing up ahead of the market rather than joining today's queue. */
export const EarlySignupForm: Story = {
	args: { context: 'early' },
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	globals: { locale: 'ar' },
};
