import type { Meta, StoryObj } from '@storybook/vue3-vite';

import type { Locale } from '../../locales';
import { RootStore, rootStoreKey } from '../../services/root.store';
import { SessionStatusEnum } from '../../services/sessionStateMachine';
import type { Language } from '../../stores/translation.store';
import GuestRegistrationForm from './GuestRegistrationForm.vue';
import GuestSignupCard from './GuestSignupCard.vue';

/**
 * The registration form itself — before a guest has submitted anything. Wrapped in
 * `GuestSignupCard` because its submission-error rules live in `guest.css`, scoped to
 * `.checkin-card`, and render unstyled without that ancestor.
 *
 * `GuestRegistrationForm` reads its guest fields, answers, and session data from `RootStore`
 * rather than taking them as props, so each story seeds a fresh store and provides it instead of
 * passing args straight through as props.
 */

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
	submissionError: boolean;
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
		submissionError: false,
		isSubmitting: false,
		minutesRemaining: null,
	},
	render: (args) => ({
		components: { GuestSignupCard, GuestRegistrationForm },
		setup() {
			const rootStore = new RootStore();

			rootStore.translations.setLanguage(args.locale as Language);
			rootStore.registration.submissionError = args.submissionError;
			rootStore.registration.isSubmitting = args.isSubmitting;

			const now = Date.now();

			rootStore.session.applyServerState({
				event:
					args.minutesRemaining === null
						? null
						: {
								id: 'story-event',
								status: SessionStatusEnum.REGISTRATION_OPEN,
								sessionMode: 'scheduled',
								capacity: 100,
								registrationOpensAt: new Date(now - 60_000).toISOString(),
								registrationClosesAt: new Date(now + args.minutesRemaining * 60_000).toISOString(),
							},
				questions: args.askExtraQuestions ? sampleQuestions : [],
				counts: {},
			});

			return { args, now, rootStore, rootStoreKey };
		},
		provide() {
			return { [this.rootStoreKey]: this.rootStore };
		},
		template: `
			<GuestSignupCard>
				<GuestRegistrationForm :context="args.context" :now="now" />
			</GuestSignupCard>
		`,
	}),
};

export default meta;

type Story = StoryObj<GuestRegistrationFormArgs>;

/** Registration open, not yet identified: sign-up and lottery-entry fields together. Whether the
 *  sign-up fields show now reads the guest store's cached identity directly, rather than an arg,
 *  so this story can no longer force the identified state — see the running app instead. */
export const RegistrationForm: Story = {};

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
	args: { submissionError: true },
};

/** The `early` context: signing up ahead of the market — identity only, no lottery fields. */
export const EarlySignupForm: Story = {
	args: { context: 'early' },
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	globals: { locale: 'ar' },
};
