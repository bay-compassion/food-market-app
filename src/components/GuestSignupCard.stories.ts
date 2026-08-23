import type { Decorator, Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, ref } from 'vue';

import { translations, type Locale } from '../locales';
import type { VisitStatus } from '../services/visitStateMachine';
import { guestVisitStatusLabel } from '../services/visitStatusLabels';
import GuestSignupCard from './GuestSignupCard.vue';
import type { GuestFormState } from './types';

/**
 * The single card a guest sees, in every state it can be in.
 *
 * The component is presentational — `App.vue` works out which state applies and hands the answer
 * down as props. These stories reproduce that derivation from one `visitStatus` control, so the
 * states stay consistent with each other: a `waiting` visit is the only one that shows a queue
 * position, `called` swaps the whole panel, and so on. Changing `visitStatus` in the controls
 * walks the guest's entire journey.
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

/**
 * `NotificationOptIn`, rendered inside every success state, asks the backend whether push and SMS
 * are configured and renders nothing when it cannot tell. There is no backend behind Storybook, so
 * without this stub the success stories would quietly hide the opt-in — one of the more
 * interesting parts of the screen. Unknown URLs fall through to the real `fetch`.
 *
 * Actually enabling notifications still will not complete here: that needs a service worker and a
 * real subscription endpoint. The stub is for laying out the panel, not exercising the flow.
 */
let endpointsStubbed = false;

function stubNotificationEndpoints() {
	if (endpointsStubbed) {
		return;
	}
	endpointsStubbed = true;

	const realFetch = window.fetch.bind(window);

	window.fetch = (input, init) => {
		const url = String(input instanceof Request ? input.url : input);

		if (url.includes('/api/push-subscription')) {
			return Promise.resolve(Response.json({ configured: true, publicKey: 'story-public-key' }));
		}
		if (url.includes('/api/sms-subscription')) {
			return Promise.resolve(Response.json({ configured: true }));
		}

		return realFetch(input, init);
	};
}

const withNotificationEndpoints: Decorator = (story) => {
	stubNotificationEndpoints();

	return story();
};

type GuestSignupCardArgs = {
	locale: Locale;
	context: 'queue' | 'early';
	/** `'none'` means the guest has not registered yet, so the form shows. */
	visitStatus: VisitStatus | 'none';
	queuePosition: number | null;
	aheadOfYou: number | null;
	canShowForm: boolean;
	showPreregisterCta: boolean;
	askExtraQuestions: boolean;
	submissionError: string;
	isSubmitting: boolean;
	isCancelling: boolean;
	/** `null` hides the countdown; a number shows it closing that many minutes from now. */
	minutesRemaining: number | null;
};

const meta: Meta<GuestSignupCardArgs> = {
	title: 'Guest/GuestSignupCard',
	component: GuestSignupCard,
	parameters: { shell: 'guest' },
	decorators: [withNotificationEndpoints],
	argTypes: {
		visitStatus: {
			control: 'select',
			options: [
				'none',
				'registered',
				'waiting',
				'called',
				'served',
				'not_placed',
				'no_show',
				'cancelled',
			],
		},
		context: { control: 'inline-radio', options: ['queue', 'early'] },
	},
	args: {
		locale: 'en',
		context: 'queue',
		visitStatus: 'none',
		queuePosition: null,
		aheadOfYou: null,
		canShowForm: true,
		showPreregisterCta: false,
		askExtraQuestions: false,
		submissionError: '',
		isSubmitting: false,
		isCancelling: false,
		minutesRemaining: null,
	},
	render: (args) => ({
		components: { GuestSignupCard },
		setup() {
			// The six `v-model`s the container normally owns.
			const guest = ref<GuestFormState>(emptyGuest());
			const pin = ref('');
			const pinConfirmation = ref('');
			const registrationType = ref<'new' | 'returning'>('new');
			const updateProfile = ref(false);
			const registrationAnswers = ref<Record<string, string | number>>({});

			// Mirrors the computed properties in `App.vue` that decide which state to show.
			const activeVisit = computed(() =>
				args.visitStatus === 'none'
					? null
					: {
							id: 'story-visit',
							status: args.visitStatus,
							queuePosition: args.queuePosition,
							aheadOfYou: args.aheadOfYou,
						},
			);
			const isWaiting = computed(() => args.visitStatus === 'waiting');
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
				activeVisit,
				now,
				registrationClosesAt,
				t: computed(() => translations[args.locale]),
				isSubmitted: computed(() => activeVisit.value !== null),
				isCalled: computed(() => args.visitStatus === 'called'),
				canCancelVisit: computed(
					() => args.visitStatus === 'registered' || args.visitStatus === 'waiting',
				),
				visitStatusLabel: computed(() =>
					activeVisit.value ? guestVisitStatusLabel(args.locale, activeVisit.value.status) : '',
				),
				queuePosition: computed(() => (isWaiting.value ? args.queuePosition : null)),
				guestsAhead: computed(() => (isWaiting.value ? args.aheadOfYou : null)),
				registrationQuestions: computed(() => (args.askExtraQuestions ? sampleQuestions : [])),
			};
		},
		template: `
			<GuestSignupCard
				v-model:guest="guest"
				v-model:pin="pin"
				v-model:pin-confirmation="pinConfirmation"
				v-model:registration-type="registrationType"
				v-model:update-profile="updateProfile"
				v-model:registration-answers="registrationAnswers"
				:t="t"
				:locale="args.locale"
				:context="args.context"
				:active-visit="activeVisit"
				:is-submitted="isSubmitted"
				:is-called="isCalled"
				:visit-status-label="visitStatusLabel"
				:queue-position="queuePosition"
				:guests-ahead="guestsAhead"
				:can-cancel-visit="canCancelVisit"
				:is-cancelling="args.isCancelling"
				visit-token="story-visit-token"
				:can-show-form="args.canShowForm"
				:show-preregister-cta="args.showPreregisterCta"
				:registration-questions="registrationQuestions"
				:submission-error="args.submissionError"
				:is-submitting="args.isSubmitting"
				:now="now"
				:registration-closes-at="registrationClosesAt"
			/>
		`,
	}),
};

export default meta;

type Story = StoryObj<GuestSignupCardArgs>;

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

/** Registration is not open and this session does not allow signing up ahead of time. */
export const RegistrationClosed: Story = {
	args: { canShowForm: false },
};

/** Closed for today, but the guest can still sign up for the next market. */
export const ClosedWithPreregistration: Story = {
	args: { canShowForm: false, showPreregisterCta: true },
};

/** The `early` context: signing up ahead of the market rather than joining today's queue. */
export const EarlySignupForm: Story = {
	args: { context: 'early' },
};

/** Confirmation after signing up early — no queue position exists yet. */
export const EarlySignupConfirmed: Story = {
	args: { context: 'early', visitStatus: 'registered' },
};

/** Registered for today, before the lottery or queue has placed the guest. */
export const Registered: Story = {
	args: { visitStatus: 'registered' },
};

/** In line, with a place in the queue and a count of the guests ahead. */
export const Waiting: Story = {
	args: { visitStatus: 'waiting', queuePosition: 7, aheadOfYou: 6 },
};

/** Next up. `guestsAhead: 0` swaps the count for the "you're next" line. */
export const WaitingNext: Story = {
	args: { visitStatus: 'waiting', queuePosition: 1, aheadOfYou: 0 },
};

/** Called to the counter — the one state that turns the card red to catch attention. */
export const Called: Story = {
	args: { visitStatus: 'called' },
};

/** Cancelling is in flight, so the cancel button is disabled. */
export const Cancelling: Story = {
	args: { visitStatus: 'waiting', queuePosition: 3, aheadOfYou: 2, isCancelling: true },
};

/** The visit is over. There is nothing left to cancel. */
export const Served: Story = {
	args: { visitStatus: 'served' },
};

/** The guest was not drawn in the lottery. */
export const NotPlaced: Story = {
	args: { visitStatus: 'not_placed' },
};

/** The guest cancelled their own visit. */
export const Cancelled: Story = {
	args: { visitStatus: 'cancelled' },
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	globals: { locale: 'ar' },
};
