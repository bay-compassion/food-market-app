import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useMemo } from 'react';
import { expect, waitFor } from 'storybook/test';

import { translations, type Locale } from '../../locales';
import type { CurrentVisit } from '../../services/guestVisitApi';
import { visitStatuses, type VisitStatus } from '../../services/visitStateMachine';
import { guestVisitStatusLabel } from '../../services/visitStatusLabels';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
import { Card } from '../ui/layout/Card';
import { CancelVisitAction } from './CancelVisitAction';
import { GuestNotOpenState } from './GuestNotOpenState';
import { GuestRegistrationClosedState } from './GuestRegistrationClosedState';
import { GuestServiceState } from './GuestServiceState';
import { GuestVisitStatus } from './GuestVisitStatus';

/**
 * `GuestView` is a container: it owns `localStorage`, polling timers, and a router, none of which
 * can be made to hold several different states at once inside one page. This catalogs every
 * market-level state card and `GuestVisitStatus` inside `Card`'s shell for every named
 * `VisitStatus`; `GuestView` presents one only after matching the visit to the displayed market,
 * and lets `cancelled` fall back to market status. The story renders statuses side by side, the same way
 * `QueueGuestRow.stories.tsx`'s `EachStatus` story does for the admin queue row. See
 * `GuestVisitStatus.stories.tsx` for each status on its own with full controls.
 *
 * `GuestVisitStatus` reads its visit from the root store rather than taking it as props, so each
 * row below gets its own store with an isolated visit lookup provided to just that row.
 */
const visitTokenStorageKey = 'bay-compassion.visit-token';

type GuestViewArgs = {
	locale: Locale;
};

// `lottery_pending` is absent on purpose: it shares the `registration_closed` card, so listing it
// would repeat a column rather than show another state.
const marketCardStatuses = ['inactive', 'registration_closed', 'service_started'] as const;

type MarketCardStatus = (typeof marketCardStatuses)[number];

function marketCardHeading(locale: Locale, status: MarketCardStatus): string {
	const copy = translations[locale].guestView;

	switch (status) {
		case 'inactive':
			return copy.notOpenState.heading;
		case 'registration_closed':
			return copy.registrationClosedState.heading;
		case 'service_started':
			return copy.serviceState.inProgressHeading;
	}
}

function visitCardHeading(locale: Locale, status: VisitStatus): string {
	const copy = translations[locale].guestView.visitStatus;

	switch (status) {
		case 'registered':
			return copy.registered.header;
		case 'waiting':
			return copy.waiting.header;
		case 'called':
			return copy.called.header;
		case 'served':
		case 'not_placed':
		case 'no_show':
		case 'cancelled':
			return copy[status].header;
	}
}

function MarketStateRow({ status, locale }: { status: MarketCardStatus; locale: Locale }) {
	const content = {
		inactive: <GuestNotOpenState />,
		registration_closed: <GuestRegistrationClosedState />,
		service_started: <GuestServiceState />,
	}[status];

	return (
		<div data-session-status={status} style={{ flex: '0 0 300px' }}>
			<h2 style={{ margin: '0 0 12px', fontSize: '15px', color: 'var(--color-text-subtle)' }}>
				{marketCardHeading(locale, status)}
			</h2>
			<section className="guest-layout" style={{ width: 'auto', padding: 0 }}>
				<Card aria-live="polite">{content}</Card>
			</section>
		</div>
	);
}

/** One `GuestVisitStatus`, backed by its own store seeded to a single fixed visit status. */
function VisitStatusRow({
	status,
	queuePosition,
	aheadOfYou,
	locale,
}: {
	status: VisitStatus;
	queuePosition: number | null;
	aheadOfYou: number | null;
	locale: Locale;
}) {
	const store = useMemo(() => {
		const token = `story-${status}`;
		const visit: CurrentVisit = {
			id: token,
			marketEventId: 'story-market',
			status,
			queuePosition,
			aheadOfYou,
		};

		return new RootStore({
			visit: {
				storage: {
					getItem: (key) => (key === visitTokenStorageKey ? token : null),
					setItem: () => undefined,
					removeItem: () => undefined,
				},
				lookupCurrentVisit: () => Promise.resolve({ found: true, visit }),
			},
		});
	}, [aheadOfYou, queuePosition, status]);

	store.translations.setLanguage(locale);

	useEffect(() => {
		void store.visit.refresh();

		return () => store[Symbol.dispose]();
	}, [store]);

	return (
		<RootStoreProvider store={store}>
			<section
				className="guest-layout"
				data-visit-status={status}
				style={{ width: 'auto', padding: 0 }}
			>
				<Card aria-live="polite">
					<GuestVisitStatus />
				</Card>
				<CancelVisitAction />
			</section>
		</RootStoreProvider>
	);
}

const meta = {
	title: 'Guest/Session States/All',
	parameters: {
		shell: 'guest',
		viewport: {
			options: {
				fill: { name: 'Fill', styles: { width: '100%', height: '100%' }, type: 'desktop' },
			},
		},
	},
	globals: { viewport: { value: 'fill' } },
	args: { locale: 'en' },
	render: ({ locale }: GuestViewArgs) => (
		<div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', margin: '0 24px' }}>
			{marketCardStatuses.map((status) => (
				<MarketStateRow key={status} status={status} locale={locale} />
			))}
			{visitStatuses.map((status) => (
				<div key={status} style={{ flex: '0 0 300px' }}>
					<h2 style={{ margin: '0 0 12px', fontSize: '15px', color: 'var(--color-text-subtle)' }}>
						{guestVisitStatusLabel(locale, status)}
					</h2>
					<VisitStatusRow
						status={status}
						queuePosition={status === 'waiting' ? 7 : null}
						aheadOfYou={status === 'waiting' ? 6 : null}
						locale={locale}
					/>
				</div>
			))}
		</div>
	),
} satisfies Meta<GuestViewArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Every named `VisitStatus`, side by side. */
export const AllStates: Story = {
	parameters: { controls: { disable: true } },
	play: async ({ canvasElement, globals }) => {
		const locale = globals.locale as Locale;

		await waitFor(async () => {
			await expect(canvasElement.querySelectorAll('[data-session-status]')).toHaveLength(
				marketCardStatuses.length,
			);
			await expect(canvasElement.querySelectorAll('[data-visit-status]')).toHaveLength(
				visitStatuses.length,
			);
			await expect(canvasElement.querySelectorAll('.success-state')).toHaveLength(
				visitStatuses.length,
			);

			for (const status of marketCardStatuses) {
				const cardHeading = canvasElement.querySelector(
					`[data-session-status="${status}"] .state-message h2`,
				);

				await expect(cardHeading).toHaveTextContent(marketCardHeading(locale, status));
			}

			for (const status of visitStatuses) {
				const cardHeading = canvasElement.querySelector(
					`[data-visit-status="${status}"] .success-state h2`,
				);

				await expect(cardHeading).toHaveTextContent(visitCardHeading(locale, status));
			}
		});
	},
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	...AllStates,
	globals: { locale: 'ar' },
};
