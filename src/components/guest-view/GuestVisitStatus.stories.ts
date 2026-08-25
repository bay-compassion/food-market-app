import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed } from 'vue';

import { translations, type Locale } from '../../locales';
import type { VisitStatus } from '../../services/visitStateMachine';
import { guestVisitStatusLabel } from '../../services/visitStatusLabels';
import GuestSignupCard from './GuestSignupCard.vue';
import GuestVisitStatus from './GuestVisitStatus.vue';

/**
 * What a guest sees once they have an active visit, in every status it can be in. Wrapped in
 * `GuestSignupCard` because `.submission-error` lives in `guest.css` scoped to `.checkin-card`,
 * and renders unstyled without that ancestor.
 */

type GuestVisitStatusArgs = {
	locale: Locale;
	visitStatus: VisitStatus;
	queuePosition: number | null;
	aheadOfYou: number | null;
	context: 'queue' | 'early';
	canCancelVisit: boolean;
	isCancelling: boolean;
	submissionError: string;
};

const meta: Meta<GuestVisitStatusArgs> = {
	title: 'Guest/Session States/GuestVisitStatus',
	component: GuestVisitStatus,
	parameters: { shell: 'guest' },
	argTypes: {
		visitStatus: {
			control: 'select',
			options: ['registered', 'waiting', 'called', 'served', 'not_placed', 'no_show', 'cancelled'],
		},
		context: { control: 'inline-radio', options: ['queue', 'early'] },
	},
	args: {
		locale: 'en',
		visitStatus: 'registered',
		queuePosition: null,
		aheadOfYou: null,
		context: 'queue',
		canCancelVisit: true,
		isCancelling: false,
		submissionError: '',
	},
	render: (args) => ({
		components: { GuestSignupCard, GuestVisitStatus },
		setup() {
			const t = computed(() => translations[args.locale]);
			const successCopy = computed(() =>
				args.context === 'early'
					? { title: t.value.earlySuccessTitle, description: t.value.earlySuccessDescription }
					: { title: t.value.successTitle, description: t.value.successDescription },
			);

			return {
				args,
				t,
				successCopy,
				isCalled: computed(() => args.visitStatus === 'called'),
				visitStatusLabel: computed(() => guestVisitStatusLabel(args.locale, args.visitStatus)),
			};
		},
		template: `
			<GuestSignupCard>
				<GuestVisitStatus
					:t="t"
					:is-called="isCalled"
					:success-title="successCopy.title"
					:success-description="successCopy.description"
					:visit-status-label="visitStatusLabel"
					:queue-position="args.queuePosition"
					:guests-ahead="args.aheadOfYou"
					:can-cancel-visit="args.canCancelVisit"
					:is-cancelling="args.isCancelling"
					:submission-error="args.submissionError"
				/>
			</GuestSignupCard>
		`,
	}),
};

export default meta;

type Story = StoryObj<GuestVisitStatusArgs>;

/** Confirmation after signing up early — no queue position exists yet. */
export const EarlySignupConfirmed: Story = {
	args: { context: 'early' },
};

/** Registered for today, before the lottery or queue has placed the guest. */
export const Registered: Story = {};

/** In line, with a place in the queue and a count of the guests ahead. */
export const Waiting: Story = {
	args: { visitStatus: 'waiting', queuePosition: 7, aheadOfYou: 6 },
};

/** Next up. `aheadOfYou: 0` swaps the count for the "you're next" line. */
export const WaitingNext: Story = {
	args: { visitStatus: 'waiting', queuePosition: 1, aheadOfYou: 0 },
};

/** Called to the counter — the one state that turns the panel into an "it's your turn" message. */
export const Called: Story = {
	args: { visitStatus: 'called' },
};

/** Cancelling is in flight, so the cancel button is disabled. */
export const Cancelling: Story = {
	args: { visitStatus: 'waiting', queuePosition: 3, aheadOfYou: 2, isCancelling: true },
};

/** The visit is over. There is nothing left to cancel. */
export const Served: Story = {
	args: { visitStatus: 'served', canCancelVisit: false },
};

/** The guest was not drawn in the lottery. */
export const NotPlaced: Story = {
	args: { visitStatus: 'not_placed', canCancelVisit: false },
};

/** The guest cancelled their own visit. */
export const Cancelled: Story = {
	args: { visitStatus: 'cancelled', canCancelVisit: false },
};

/** A failed cancel request. The error sits above the cancel button. */
export const CancelFailed: Story = {
	args: {
		visitStatus: 'waiting',
		queuePosition: 3,
		aheadOfYou: 2,
		submissionError: translations.en.visitError,
	},
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	args: { visitStatus: 'waiting', queuePosition: 7, aheadOfYou: 6 },
	globals: { locale: 'ar' },
};
