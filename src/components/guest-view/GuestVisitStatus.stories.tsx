import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, within } from 'storybook/test';

import { translations, type Locale } from '../../locales';
import { SessionStatusEnum } from '../../services/sessionStateMachine';
import type { VisitStatus } from '../../services/visitStateMachine';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
import { ConfirmationDrawer } from '../ui/ConfirmationDrawer';
import { GuestVisitState } from './GuestVisitState';

/**
 * What a guest sees once they have a current visit, in every status it can be in. Rendered through
 * `GuestVisitState`, the same composition the guest screen mounts, so the card, the refresh
 * countdown, and the cancel action stay in the arrangement they actually ship in.
 *
 * `GuestVisitStatus` reads the current visit from the root store rather than taking it as props,
 * so each story seeds a fresh store whose own visit lookup answers for it.
 *
 * That lookup is handed to the store rather than faked on `window.fetch`, and the visit token lives
 * in the store's own storage rather than `localStorage`. A docs page renders every one of these
 * stories in one window, and the visit store refreshes itself every fifteen seconds: with a shared
 * `fetch`, whichever story rendered last answered for all of them, and every card eventually turned
 * into that story's status.
 */
const visitTokenStorageKey = 'bay-compassion.visit-token';

type GuestVisitStatusArgs = {
	locale: Locale;
	visitStatus: VisitStatus;
	queuePosition: number | null;
	aheadOfYou: number | null;
	isCancelling: boolean;
	submissionError: boolean;
};

/** A store whose visit is this story's, and which touches no state outside itself. */
function seededStore({
	locale,
	visitStatus,
	queuePosition,
	aheadOfYou,
	isCancelling,
	submissionError,
}: GuestVisitStatusArgs) {
	const saved = new Map([[visitTokenStorageKey, 'story-visit-token']]);
	const store = new RootStore({
		visit: {
			storage: {
				getItem: (key) => saved.get(key) ?? null,
				setItem: (key, value) => void saved.set(key, value),
				removeItem: (key) => void saved.delete(key),
			},
			lookupCurrentVisit: async () => ({
				found: true,
				visit: {
					id: 'story-visit',
					marketEventId: 'story-market',
					status: visitStatus,
					queuePosition,
					aheadOfYou,
				},
			}),
			cancelVisit: () => {
				if (isCancelling) {
					return new Promise(() => {});
				}

				return submissionError
					? Promise.reject(new Error('cancel'))
					: Promise.resolve({ id: 'story-visit', status: 'cancelled' as const });
			},
		},
	});
	const now = Date.now();

	store.translations.setLanguage(locale);
	store.session.applyServerState({
		event: {
			id: 'story-market',
			status: SessionStatusEnum.REGISTRATION_OPEN,
			capacity: 100,
			registrationOpensAt: new Date(now - 60_000).toISOString(),
			registrationClosesAt: new Date(now + 15 * 60_000).toISOString(),
		},
		questions: [],
		counts: {},
	});
	void store.visit.refresh().then(() => {
		if (isCancelling || submissionError) {
			void store.visit.cancel();
		}
	});

	return store;
}

function VisitStatusPanel(args: GuestVisitStatusArgs) {
	// Built once per set of args: a store made on every render would be thrown away, refresh and
	// all, each time the page around it re-rendered.
	const [store] = useState(() => seededStore(args));

	return (
		<RootStoreProvider store={store}>
			<GuestVisitState />
			{/*
			 * The preview's own sheet hangs off the decorator's store, not this seeded one, so the
			 * cancel action would await an answer from a sheet that never opens. A nested provider
			 * has to carry its own.
			 */}
			<ConfirmationDrawer />
		</RootStoreProvider>
	);
}

/** Seeds a store for this story's visit, and starts over when the toolbar or a control changes it. */
function SeededVisitStatus(args: GuestVisitStatusArgs) {
	return <VisitStatusPanel key={JSON.stringify(args)} {...args} />;
}

const meta = {
	title: 'Guest/Session States/GuestVisitStatus',
	component: SeededVisitStatus,
	parameters: { shell: 'guest' },
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
export const Registered: Story = {
	play: async ({ canvas }) => {
		await expect(
			await canvas.findByText(translations.en.guestView.visitStatus.registered.header),
		).toBeInTheDocument();
		await expect(canvas.getByText(translations.en.registrationClosesIn)).toBeInTheDocument();
	},
};

/** In line, with a place in the queue and a count of the guests ahead. */
export const Waiting: Story = {
	args: { visitStatus: 'waiting', queuePosition: 7, aheadOfYou: 6 },
};

/** Next up. `aheadOfYou: 0` swaps the count for the "you're next" line. */
export const WaitingNext: Story = {
	args: { visitStatus: 'waiting', queuePosition: 1, aheadOfYou: 0 },
};

/** Called to the entrance — the one state that turns the panel into an "it's your turn" message. */
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
	/**
	 * Opens the cancel confirmation and leaves the visit alone. This covers the sheet reaching the
	 * seeded store at all — one mounted outside this story's provider would leave `ask()` waiting
	 * forever, with nothing on screen to say so — and that the question arrives in Arabic.
	 */
	play: async ({ canvas, userEvent }) => {
		const copy = translations.ar.guestView.visitStatus;

		await userEvent.click(await canvas.findByRole('button', { name: copy.cancelAction }));

		const sheet = within(await within(document.body).findByRole('alertdialog'));

		await expect(sheet.getByRole('heading', { name: copy.cancelConfirmation })).toBeInTheDocument();
		await userEvent.click(sheet.getByRole('button', { name: copy.cancelDismiss }));
	},
};
