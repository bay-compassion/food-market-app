import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';

import type { Locale } from '../../locales';
import type { VisitStatus } from '../../services/visitStateMachine';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
import { Card } from '../ui/layout/Card';
import { GuestVisitStatus } from './GuestVisitStatus';

/**
 * What a guest sees once they have a current visit, in every status it can be in. Wrapped in
 * `Card` for the frame this screen normally sits inside.
 *
 * `GuestVisitStatus` reads the current visit from the root store rather than taking it as props,
 * so each story seeds a fresh store — via a mocked `/api/visit` — instead of passing visit fields
 * straight through as props.
 */
const visitTokenStorageKey = 'bay-compassion.visit-token';
const originalFetch = window.fetch.bind(window);

type GuestVisitStatusArgs = {
	locale: Locale;
	visitStatus: VisitStatus;
	queuePosition: number | null;
	aheadOfYou: number | null;
	isCancelling: boolean;
	submissionError: boolean;
};

const withVisitEndpoint: Decorator = (Story, context) => {
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
					marketEventId: 'story-market',
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

	return <Story />;
};

/** Seeds a store from the mocked endpoint above, then renders the panel against it. */
function SeededVisitStatus({ locale, isCancelling, submissionError }: GuestVisitStatusArgs) {
	const store = new RootStore();

	store.translations.setLanguage(locale);
	void store.visit.refresh().then(() => {
		if (isCancelling || submissionError) {
			void store.visit.cancel();
		}
	});

	return (
		<RootStoreProvider store={store}>
			<Card aria-live="polite">
				<GuestVisitStatus onCancelVisit={() => void store.visit.cancel()} />
			</Card>
		</RootStoreProvider>
	);
}

const meta = {
	title: 'Guest/Session States/GuestVisitStatus',
	component: SeededVisitStatus,
	parameters: { shell: 'guest' },
	decorators: [withVisitEndpoint],
	argTypes: {
		visitStatus: {
			control: 'select',
			options: ['registered', 'waiting', 'called', 'served', 'not_placed', 'no_show', 'cancelled'],
		},
	},
	args: {
		locale: 'en',
		visitStatus: 'registered',
		queuePosition: null,
		aheadOfYou: null,
		isCancelling: false,
		submissionError: false,
	},
} satisfies Meta<typeof SeededVisitStatus>;

export default meta;

type Story = StoryObj<typeof meta>;

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

/** A worker marked the guest absent, but may still return them to the queue. */
export const NoShow: Story = {
	args: { visitStatus: 'no_show' },
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
