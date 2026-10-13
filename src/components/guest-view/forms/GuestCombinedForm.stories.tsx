import type { Meta, StoryObj } from '@storybook/react-vite';
import { runInAction } from 'mobx';
import { expect, userEvent, waitFor } from 'storybook/test';

import { translations, type Locale } from '../../../locales';
import { StorageKey, StorageService } from '../../../services/storage.service';
import type { SessionQuestion } from '../../../stores/market-session.store';
import { RootStoreProvider } from '../../../stores/react/store-context';
import { RootStore } from '../../../stores/root.store';
import { MemoryStorage } from '../memory-storage.fixture';
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
	/** A phone that saved the guest's name and phone on an earlier visit. */
	returningGuest?: boolean;
};

type RegistrationFormArgs = SeededState & {
	/** Driven by the toolbar's locale picker, per the repo's story convention. */
	locale: Locale;
};

/**
 * A store in the state the story wants. `applyServerState` is the same entry point the polling
 * response goes through, so a story cannot drift into a shape the server could not produce.
 */
function seededStore(
	{ askExtraQuestions, submissionError, isSubmitting, returningGuest }: SeededState,
	locale: Locale,
) {
	// What this phone remembers lives in memory, not the shared window's `localStorage`.
	const storage = new StorageService(new MemoryStorage());

	if (returningGuest) {
		storage.set(StorageKey.GUEST_DEVICE_TOKEN, 'returning-guest-device-token');
		storage.set(StorageKey.GUEST_IDENTITY, {
			firstName: 'Siobhan',
			lastName: 'Kelly',
			phone: '(510) 555-0123',
		});
	}

	const store = new RootStore({ storage });

	store.translations.setLanguage(locale);
	// Direct writes to observables belong in an action; these two have no setter of their own
	// because nothing but a story ever sets them from outside the store.
	runInAction(() => {
		store.registration.submissionError = submissionError ?? false;
		store.registration.isSubmitting = isSubmitting ?? false;
	});
	store.session.applyServerState({
		event: null,
		questions: askExtraQuestions ? sampleQuestions : [],
		counts: {},
	});

	return store;
}

/**
 * The story's own view of the form: the seeded state is not props the component takes, so it is
 * turned into a store here and provided around it.
 */
function SeededForm({ locale, ...seed }: RegistrationFormArgs) {
	// This store nests inside — and so overrides — the preview decorator's, which is why it has to
	// carry the toolbar's locale across too.
	const store = seededStore(seed, locale);

	return (
		<RootStoreProvider store={store}>
			<GuestCombinedForm />
		</RootStoreProvider>
	);
}

const meta = {
	title: 'Guest/Registration/Combined Form',
	component: SeededForm,
	parameters: { shell: 'guest' },
	args: {
		locale: 'en',
	},
} satisfies Meta<typeof SeededForm>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Registration open, not yet identified: sign-up and lottery-entry fields together. See
 * `ReturningGuest` for a phone that already saved the guest's details.
 */
export const RegistrationForm: Story = {
	play: async ({ canvas }) => {
		await expect(
			canvas.getByRole('heading', { name: translations.en.formTitle }),
		).toBeInTheDocument();
		await expect(canvas.getByLabelText(translations.en.firstName)).toBeInTheDocument();
		await expect(canvas.getByLabelText(translations.en.age)).toBeInTheDocument();
		await expect(
			canvas.getByRole('group', { name: translations.en.guestView.forms.informationLegend }),
		).toBeInTheDocument();
		await expect(
			canvas.getByRole('group', { name: translations.en.guestView.forms.lotteryLegend }),
		).toBeInTheDocument();
		await expect(canvas.getByRole('button', { name: translations.en.submit })).toBeEnabled();
	},
};

/**
 * A returning guest: their name and phone are saved on this phone and not asked for again, but
 * they are still offered a way to say how their name is pronounced. The field stays folded away
 * until they take the offer up.
 */
export const ReturningGuest: Story = {
	args: { returningGuest: true },
	play: async ({ canvas }) => {
		const forms = translations.en.guestView.forms;

		await expect(canvas.queryByLabelText(translations.en.firstName)).toBeNull();
		await expect(canvas.queryByLabelText(forms.pronunciationLabel)).toBeNull();

		await userEvent.click(canvas.getByRole('button', { name: forms.pronunciationOffer }));

		// Focus follows once the panel has finished opening.
		await waitFor(() => expect(canvas.getByLabelText(forms.pronunciationLabel)).toHaveFocus());
	},
};

/** Registration questions configured in the admin question bank appear at the end of the form. */
export const WithRegistrationQuestions: Story = {
	args: { askExtraQuestions: true },
	play: async ({ canvas }) => {
		await expect(
			canvas.getByRole('group', { name: translations.en.guestView.forms.questionsLegend }),
		).toBeInTheDocument();
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

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	globals: { locale: 'ar' },
	play: async ({ canvas }) => {
		await expect(
			canvas.getByRole('heading', { name: translations.ar.formTitle }),
		).toBeInTheDocument();
	},
};
