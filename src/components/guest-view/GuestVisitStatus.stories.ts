import type { Decorator, Meta, StoryObj } from '@storybook/vue3-vite';
import { computed } from 'vue';

import { translations, type Locale } from '../../locales';
import type { VisitStatus } from '../../services/visitStateMachine';
import { RootStore, rootStoreKey } from '../../stores/root.store';
import type { Language } from '../../stores/translation.store';
import Card from '../ui/layout/Card.vue';
import GuestVisitStatus from './GuestVisitStatus.vue';

/**
 * What a guest sees once they have an active visit, in every status it can be in. Wrapped in
 * `Card` for the frame this screen normally sits inside.
 *
 * `GuestVisitStatus` reads the active visit from `RootStore` rather than taking it as props, so
 * each story seeds a fresh store — via a mocked `/api/visit` — instead of passing visit fields
 * straight through as props.
 */

const visitTokenStorageKey = 'bay-compassion.visit-token';
const originalFetch = window.fetch.bind(window);

type GuestVisitStatusArgs = {
	locale: Locale;
	visitStatus: VisitStatus;
	queuePosition: number | null;
	aheadOfYou: number | null;
	context: 'queue' | 'early';
	isCancelling: boolean;
	submissionError: boolean;
};

const withVisitEndpoint: Decorator = (story, context) => {
	const args = context.args as GuestVisitStatusArgs;

	window.localStorage.setItem(visitTokenStorageKey, 'story-visit-token');

	window.fetch = (input, init) => {
		const url = String(input instanceof Request ? input.url : input);

		if (url !== '/api/visit') {
			return originalFetch(input, init);
		}

		if ((init?.method ?? 'GET') === 'GET') {
			return Promise.resolve(
				Response.json({
					id: 'story-visit',
					status: args.visitStatus,
					queuePosition: args.queuePosition,
					aheadOfYou: args.aheadOfYou,
				}),
			);
		}

		if (args.isCancelling) {
			return new Promise(() => {});
		}

		if (args.submissionError) {
			return Promise.resolve(new Response(null, { status: 500 }));
		}

		return Promise.resolve(Response.json({ id: 'story-visit', status: 'cancelled' }));
	};

	return story();
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
		isCancelling: false,
		submissionError: false,
	},
	decorators: [withVisitEndpoint],
	render: (args) => ({
		components: { Card, GuestVisitStatus },
		setup() {
			const rootStore = new RootStore();

			rootStore.translations.setLanguage(args.locale as Language);
			void rootStore.visit.refresh().then(() => {
				if (args.isCancelling || args.submissionError) {
					void rootStore.visit.cancel();
				}
			});

			const t = computed(() => translations[args.locale]);
			const successCopy = computed(() =>
				args.context === 'early'
					? { title: t.value.earlySuccessTitle, description: t.value.earlySuccessDescription }
					: { title: t.value.successTitle, description: t.value.successDescription },
			);

			return { rootStore, rootStoreKey, successCopy };
		},
		provide() {
			return { [this.rootStoreKey]: this.rootStore };
		},
		template: `
			<Card aria-live="polite">
				<GuestVisitStatus
					:success-title="successCopy.title"
					:success-description="successCopy.description"
				/>
			</Card>
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

/** A failed cancel request. The error sits above the cancel button. */
export const CancelFailed: Story = {
	args: { visitStatus: 'waiting', queuePosition: 3, aheadOfYou: 2, submissionError: true },
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	args: { visitStatus: 'waiting', queuePosition: 7, aheadOfYou: 6 },
	globals: { locale: 'ar' },
};
