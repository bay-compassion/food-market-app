import type { Meta, StoryObj } from '@storybook/react-vite';

import type { Locale } from '../../locales';
import { visitStatuses, type VisitStatus } from '../../services/visitStateMachine';
import { guestVisitStatusLabel } from '../../services/visitStatusLabels';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
import { Card } from '../ui/layout/Card';
import { GuestVisitStatus } from './GuestVisitStatus';

/**
 * `GuestView` is a container: it owns `localStorage`, polling timers, and a router, none of which
 * can be made to hold several different states at once inside one page. This catalogs
 * `GuestVisitStatus` inside `Card`'s shell for every named `VisitStatus`; `GuestView` presents one
 * only after matching the visit to the displayed market, and lets `cancelled` fall back to market
 * status. The story renders statuses side by side, the same way
 * `QueueGuestRow.stories.tsx`'s `EachStatus` story does for the admin queue row. See
 * `GuestVisitStatus.stories.tsx` for each status on its own with full controls.
 *
 * `GuestVisitStatus` reads its visit from the root store rather than taking it as props, so each
 * row below gets its own store — seeded through a mocked `/api/visit` — provided to just that row.
 */
const visitTokenStorageKey = 'bay-compassion.visit-token';
const originalFetch = window.fetch.bind(window);

type GuestViewArgs = {
	locale: Locale;
};

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
	window.localStorage.setItem(visitTokenStorageKey, `story-${status}`);

	const store = new RootStore();

	store.translations.setLanguage(locale);

	window.fetch = (input, init) => {
		const url = String(input instanceof Request ? input.url : input);

		if (url !== '/api/visit') {
			return originalFetch(input, init);
		}

		return Promise.resolve(
			Response.json({
				id: `story-${status}`,
				marketEventId: 'story-market',
				status,
				queuePosition,
				aheadOfYou,
			}),
		);
	};
	void store.visit.refresh();

	return (
		<RootStoreProvider store={store}>
			<section className="guest-layout" style={{ width: 'auto', padding: 0 }}>
				<Card aria-live="polite">
					<GuestVisitStatus onCancelVisit={() => void store.visit.cancel()} />
				</Card>
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
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	...AllStates,
	globals: { locale: 'ar' },
};
