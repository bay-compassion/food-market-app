import type { Meta, StoryObj } from '@storybook/react-vite';
import { runInAction } from 'mobx';
import { expect, fn } from 'storybook/test';

import { translations, type Locale } from '../../../locales';
import { SessionStatusEnum } from '../../../services/sessionStateMachine';
import type { SessionQuestion } from '../../../stores/market-session.store';
import { RootStoreProvider } from '../../../stores/react/store-context';
import { RootStore } from '../../../stores/root.store';
import { GuestCombinedForm } from './GuestCombinedForm';

/**
 * The registration form itself — before a guest has submitted anything.
 *
 * The form reads its guest fields, answers, and session data from the root store rather than
 * taking them as props, so the stories that need a particular phase seed their own store and
 * provide it. That provider nests inside the preview's default one and wins, which is what makes
 * "submitting" and "failed" reachable at all — neither is a prop.
 */
const sampleQuestions: SessionQuestion[] = [
	{
		id: 'q-transport',
		prompt: 'How did you travel here today?',
		type: 'text',
		required: false,
	},
	{ id: 'q-rating', prompt: 'How easy was it to sign up?', type: 'scale', required: true },
];

type SeededState = {
	askExtraQuestions?: boolean;
	submissionError?: boolean;
	isSubmitting?: boolean;
	/** `undefined` hides the countdown; a number shows it closing that many minutes from now. */
	minutesRemaining?: number;
};

type RegistrationFormArgs = SeededState & {
	/** Driven by the toolbar's locale picker, per the repo's story convention. */
	locale: Locale;
	context: 'queue' | 'early';
	onSubmitted: (result: unknown) => void;
};

/**
 * A store in the state the story wants. `applyServerState` is the same entry point the polling
 * response goes through, so a story cannot drift into a shape the server could not produce.
 */
function seededStore(
	{ askExtraQuestions, submissionError, isSubmitting, minutesRemaining }: SeededState,
	locale: Locale,
) {
	const store = new RootStore();
	const now = Date.now();

	store.translations.setLanguage(locale);
	// Direct writes to observables belong in an action; these two have no setter of their own
	// because nothing but a story ever sets them from outside the store.
	runInAction(() => {
		store.registration.submissionError = submissionError ?? false;
		store.registration.isSubmitting = isSubmitting ?? false;
	});
	store.session.applyServerState({
		event:
			minutesRemaining === undefined
				? null
				: {
						id: 'story-event',
						status: SessionStatusEnum.REGISTRATION_OPEN,
						sessionMode: 'scheduled',
						capacity: 100,
						registrationOpensAt: new Date(now - 60_000).toISOString(),
						registrationClosesAt: new Date(now + minutesRemaining * 60_000).toISOString(),
					},
		questions: askExtraQuestions ? sampleQuestions : [],
		counts: {},
	});

	return store;
}

/**
 * The story's own view of the form: the seeded state is not props the component takes, so it is
 * turned into a store here and provided around it.
 */
function SeededForm({ context, onSubmitted, locale, ...seed }: RegistrationFormArgs) {
	// This store nests inside — and so overrides — the preview decorator's, which is why it has to
	// carry the toolbar's locale across too.
	const store = seededStore(seed, locale);

	// A fixed value rather than a live-ticking clock keeps the countdown stable while the story
	// sits open, matching `RegistrationCountdown`'s own stories.
	return (
		<RootStoreProvider store={store}>
			<GuestCombinedForm context={context} now={Date.now()} onSubmitted={onSubmitted} />
		</RootStoreProvider>
	);
}

const meta = {
	title: 'Guest/Forms/Combined Form',
	component: SeededForm,
	parameters: { shell: 'guest' },
	argTypes: {
		context: { control: 'inline-radio', options: ['queue', 'early'] },
	},
	args: {
		locale: 'en',
		context: 'queue',
		onSubmitted: fn(),
	},
} satisfies Meta<typeof SeededForm>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Registration open, not yet identified: sign-up and lottery-entry fields together. Whether the
 * sign-up fields show reads the guest store's cached identity, not an arg, so this story cannot
 * force the identified state — see the running app instead.
 */
export const RegistrationForm: Story = {
	play: async ({ canvas }) => {
		await expect(
			canvas.getByRole('heading', { name: translations.en.formTitle }),
		).toBeInTheDocument();
		await expect(canvas.getByLabelText(translations.en.firstName)).toBeInTheDocument();
		await expect(canvas.getByLabelText(translations.en.age)).toBeInTheDocument();
		await expect(canvas.getByRole('button', { name: translations.en.submit })).toBeEnabled();
	},
};

/** Registration open, with the closing countdown showing above the form title. */
export const RegistrationClosingSoon: Story = {
	args: { minutesRemaining: 5 },
	play: async ({ canvasElement }) => {
		await expect(canvasElement.querySelector('.registration-countdown')).toBeInTheDocument();
	},
};

/** Registration questions configured in the admin question bank appear at the end of the form. */
export const WithRegistrationQuestions: Story = {
	args: { askExtraQuestions: true },
	play: async ({ canvas }) => {
		await expect(canvas.getByText(sampleQuestions[0]!.prompt)).toBeInTheDocument();
	},
};

/** The form as it appears while the submission request is in flight. */
export const Submitting: Story = {
	args: { isSubmitting: true },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('button', { name: translations.en.submitting })).toBeDisabled();
	},
};

/** A failed submission. The error sits directly above the submit button. */
export const SubmissionFailed: Story = {
	args: { submissionError: true },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('alert')).toHaveTextContent(translations.en.submissionError);
	},
};

/** The `early` context: saving information for later — identity only, no lottery fields. */
export const EarlySignupForm: Story = {
	args: { context: 'early' },
	play: async ({ canvas }) => {
		await expect(
			canvas.getByRole('heading', { name: translations.en.signupView.formTitle }),
		).toBeInTheDocument();
		await expect(canvas.queryByLabelText(translations.en.age)).not.toBeInTheDocument();
	},
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	globals: { locale: 'ar' },
	play: async ({ canvas }) => {
		await expect(
			canvas.getByRole('heading', { name: translations.ar.formTitle }),
		).toBeInTheDocument();
	},
};
