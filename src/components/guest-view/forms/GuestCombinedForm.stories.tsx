import type { Meta, StoryObj } from '@storybook/react-vite';
import { runInAction } from 'mobx';
import { expect, userEvent, waitFor, within } from 'storybook/test';

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
	/** A phone that also kept the household from that visit, so nothing is left to fill in. */
	savedHousehold?: boolean;
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
	{ askExtraQuestions, submissionError, isSubmitting, returningGuest, savedHousehold }: SeededState,
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

	if (savedHousehold) {
		storage.set(StorageKey.GUEST_HOUSEHOLD, {
			ageRange: '30-44',
			householdSize: 3,
			childrenCount: 1,
			seniorsCount: 0,
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
	play: async ({ canvas, canvasElement }) => {
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
		// Drawn as "not yet", but never disabled: tapped early, it takes the guest to what's missing.
		const button = canvas.getByRole('button', { name: translations.en.submit });

		await expect(canvasElement.querySelector('.submit-bar')).toHaveAttribute('data-awaiting');
		await expect(button).toBeEnabled();
		await userEvent.click(button);
		await waitFor(() => expect(canvas.getByLabelText(translations.en.firstName)).toHaveFocus());
	},
};

/**
 * A returning guest: their name and phone are saved on this phone, shown in the identity card
 * above, and not asked for again — nor is how their name is pronounced. Only the lottery-entry
 * fields remain.
 */
export const ReturningGuest: Story = {
	args: { returningGuest: true },
	play: async ({ canvas }) => {
		const forms = translations.en.guestView.forms;

		await expect(canvas.queryByLabelText(translations.en.firstName)).toBeNull();
		await expect(canvas.queryByRole('button', { name: forms.pronunciationOffer })).toBeNull();
		await expect(canvas.getByLabelText(translations.en.age)).toBeInTheDocument();
	},
};

/**
 * A returning guest whose phone kept everything from their last visit. Every field is filled in,
 * but a prefilled form is not a finished one: the saved household is shown as a summary for them
 * to confirm, and the pinned bar lists what is left. Join waits, drawn as "not yet".
 */
export const ConfirmSavedHousehold: Story = {
	args: { returningGuest: true, savedHousehold: true },
	play: async ({ canvas, canvasElement }) => {
		const { savedHousehold, joinSteps } = translations.en.guestView.forms;

		await expect(canvas.getByRole('heading', { name: savedHousehold.heading })).toBeVisible();
		await expect(canvas.queryByLabelText(translations.en.age)).toBeNull();
		await expect(canvas.getByRole('list', { name: joinSteps.label })).toHaveTextContent(
			joinSteps.confirmHousehold,
		);
		await expect(canvasElement.querySelector('.submit-bar')).toHaveAttribute('data-awaiting');
		await expect(canvasElement.querySelector('.submit-bar')).not.toHaveAttribute('data-pulse');
	},
};

/**
 * Join tapped before confirming: the browser's own validation takes the guest to the summary, the
 * same way it takes a guest to an empty field.
 */
export const JoinBeforeConfirming: Story = {
	args: { returningGuest: true, savedHousehold: true },
	play: async ({ canvas, canvasElement }) => {
		const { savedHousehold } = translations.en.guestView.forms;

		await userEvent.click(canvas.getByRole('button', { name: translations.en.submit }));

		await waitFor(() =>
			expect(canvas.getByRole('textbox', { name: savedHousehold.prompt })).toHaveFocus(),
		);
		await expect(canvasElement.querySelector('.saved-household')).toBeInTheDocument();
	},
};

/**
 * Once the guest says the household is still right, the summary folds to one line and, with
 * nothing else asked, the pinned bar points them at the button, which keeps pulsing for as long as
 * that stays true.
 */
export const ReadyToJoin: Story = {
	args: { returningGuest: true, savedHousehold: true },
	play: async ({ canvas, canvasElement }) => {
		const { savedHousehold } = translations.en.guestView.forms;

		await userEvent.click(canvas.getByRole('button', { name: savedHousehold.confirm }));

		const button = canvas.getByRole('button', { name: translations.en.submit });

		await expect(canvas.getByText(savedHousehold.confirmed)).toBeVisible();
		await expect(canvasElement.querySelector('.submit-bar')).toHaveAttribute('data-ready');
		await expect(canvasElement.querySelector('.submit-bar')).not.toHaveAttribute('data-awaiting');
		await expect(canvasElement.querySelector('.submit-bar')).toHaveAttribute('data-pulse');
		await expect(getComputedStyle(button).animationIterationCount).toBe('infinite');
	},
};

/**
 * "Change" opens the saved household in a dialog. "Update" waits for a change; once it is made,
 * "Update" puts it in the form and confirms the household, so the pinned bar is ready.
 */
export const ChangeSavedHousehold: Story = {
	args: { returningGuest: true, savedHousehold: true },
	play: async ({ canvas, canvasElement }) => {
		const { savedHousehold } = translations.en.guestView.forms;
		const page = within(document.body);

		await userEvent.click(canvas.getByRole('button', { name: savedHousehold.change }));

		const dialog = await page.findByRole('dialog', { name: savedHousehold.changeHeading });
		const update = within(dialog).getByRole('button', { name: savedHousehold.update });

		await expect(within(dialog).getByLabelText(translations.en.age)).toHaveValue('30-44');
		await expect(update).toBeDisabled();
		// The form behind is still waiting for the guest: no change has been made yet.
		await expect(canvasElement.querySelector('.submit-bar')).not.toHaveAttribute('data-pulse');

		await userEvent.selectOptions(within(dialog).getByLabelText(translations.en.age), '45-59');
		await expect(update).toBeEnabled();
		await userEvent.click(update);

		await waitFor(() => expect(page.queryByRole('dialog')).toBeNull());
		await expect(canvas.getByText(savedHousehold.confirmed)).toBeVisible();
		await expect(canvasElement.querySelector('.submit-bar')).toHaveAttribute('data-pulse');
	},
};

/** "Cancel" drops the changes and puts the guest back at the summary, still to confirm. */
export const CancelChangingSavedHousehold: Story = {
	args: { returningGuest: true, savedHousehold: true },
	play: async ({ canvas }) => {
		const { savedHousehold } = translations.en.guestView.forms;
		const page = within(document.body);

		await userEvent.click(canvas.getByRole('button', { name: savedHousehold.change }));

		const dialog = await page.findByRole('dialog', { name: savedHousehold.changeHeading });

		await userEvent.selectOptions(within(dialog).getByLabelText(translations.en.age), '45-59');
		await userEvent.click(within(dialog).getByRole('button', { name: savedHousehold.cancel }));

		await waitFor(() => expect(page.queryByRole('dialog')).toBeNull());
		await expect(canvas.getByRole('heading', { name: savedHousehold.heading })).toBeVisible();
		await expect(canvas.getByText(translations.en.ageRange30to44)).toBeVisible();
	},
};

/**
 * A returning guest with this week's questions: confirming the household is not enough until each
 * question has an answer, optional ones too.
 */
export const ReturningGuestWithQuestions: Story = {
	args: { returningGuest: true, savedHousehold: true, askExtraQuestions: true },
	play: async ({ canvas, canvasElement }) => {
		const { savedHousehold, joinSteps } = translations.en.guestView.forms;

		await userEvent.click(canvas.getByRole('button', { name: savedHousehold.confirm }));

		const steps = canvas.getByRole('list', { name: joinSteps.label });

		await expect(steps).toHaveTextContent(joinSteps.householdConfirmed);
		await expect(steps).toHaveTextContent(joinSteps.answerQuestions);
		await expect(canvasElement.querySelector('.submit-bar')).toHaveAttribute('data-awaiting');
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
