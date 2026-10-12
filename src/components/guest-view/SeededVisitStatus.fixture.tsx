import type { ArgTypes, Decorator } from '@storybook/react-vite';
import { useState } from 'react';

import type { Locale } from '../../locales';
import { SessionStatusEnum } from '../../services/sessionStateMachine';
import { StorageKey, StorageService } from '../../services/storage.service';
import type { VisitStatus } from '../../services/visitStateMachine';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
import {
	LINE_POSITION_INDICATOR_FLAG_KEY,
	type LinePositionIndicator,
} from '../hooks/use-line-position-indicator';
import { StaticLDProvider } from '../StaticLDProvider';
import { ConfirmationDrawer } from '../ui/ConfirmationDrawer';
import { GuestVisitState } from './GuestVisitState';

/**
 * Story support for a guest's current visit, shared by the visit status stories. Rendered through
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

export type GuestVisitStatusArgs = {
	locale: Locale;
	visitStatus: VisitStatus;
	queuePosition: number | null;
	priorityNumber: number | null;
	aheadOfYou: number | null;
	nowCalling: number | null;
	called: number[];
	calledPriority: number[];
	isCancelling: boolean;
	submissionError: boolean;
};

/** A store whose visit is this story's, and which touches no state outside itself. */
function seededStore({
	locale,
	visitStatus,
	queuePosition,
	priorityNumber,
	aheadOfYou,
	nowCalling,
	called,
	calledPriority,
	isCancelling,
	submissionError,
}: GuestVisitStatusArgs) {
	const saved = new Map([[visitTokenStorageKey, 'story-visit-token']]);
	// The guest the waiting and called cards stamp by name. Kept in the store's own storage too, so
	// no story on a docs page reads another's identity out of `localStorage`.
	const guestSaved = new Map<string, string>([
		[StorageKey.GUEST_DEVICE_TOKEN, JSON.stringify('story-device-token')],
		[
			StorageKey.GUEST_IDENTITY,
			JSON.stringify({ firstName: 'Ada', lastName: 'Lovelace', phone: '510-555-0123' }),
		],
	]);
	const store = new RootStore({
		storage: new StorageService({
			getItem: (key) => guestSaved.get(key) ?? null,
			setItem: (key, value) => void guestSaved.set(key, value),
			removeItem: (key) => void guestSaved.delete(key),
		} as Storage),
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
					priorityNumber,
					aheadOfYou,
					nowCalling,
					called,
					calledPriority,
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
export function SeededVisitStatus(args: GuestVisitStatusArgs) {
	return <VisitStatusPanel key={JSON.stringify(args)} {...args} />;
}

/** The controls every visit status story starts from. */
export const visitStatusArgTypes: Partial<ArgTypes<GuestVisitStatusArgs>> = {
	visitStatus: {
		control: 'select',
		options: ['registered', 'waiting', 'called', 'served', 'not_placed', 'no_show', 'cancelled'],
	},
};

/** The visit every visit status story starts from, before its own args. */
export const defaultVisitStatusArgs: GuestVisitStatusArgs = {
	locale: 'en',
	visitStatus: 'registered',
	queuePosition: null,
	priorityNumber: null,
	aheadOfYou: null,
	nowCalling: null,
	called: [],
	calledPriority: [],
	isCancelling: false,
	submissionError: false,
};

/** Pins the `line-position-indicator` flag for one story. */
export function withIndicator(indicator: LinePositionIndicator): Decorator[] {
	return [
		(Story) => (
			<StaticLDProvider flags={{ [LINE_POSITION_INDICATOR_FLAG_KEY]: indicator }}>
				<Story />
			</StaticLDProvider>
		),
	];
}
