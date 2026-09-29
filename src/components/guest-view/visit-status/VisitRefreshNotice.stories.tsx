import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { translations, type Locale } from '../../../locales';
import type { VisitStatus } from '../../../services/visitStateMachine';
import { RootStoreProvider } from '../../../stores/react/store-context';
import { RootStore } from '../../../stores/root.store';
import { RELOAD_COUNTDOWN_FLAG_KEY } from '../../hooks/use-reload-countdown';
import { StaticLDProvider } from '../../StaticLDProvider';
import { VisitRefreshNotice } from './VisitRefreshNotice';

/**
 * The line beneath a live visit that says when the queue standing next updates. It exists to keep
 * guests from pulling to refresh: without it the screen looks frozen between background updates,
 * and a reload is the only obvious way to check.
 *
 * The notice reads the schedule from the visit store rather than taking props, so each story seeds
 * its own store — a stubbed visit lookup and a refresh interval — and provides it. A visit in a
 * finished state schedules nothing, which is why `Served` renders empty. The notice sits behind the
 * `show-reload-countdown` flag, off by default, so these stories turn it on unless they say otherwise.
 */
const storyVisitToken = 'story-visit-token';

/** Stands in for `localStorage` so the story's token cannot leak into other stories. */
const tokenStorage = {
	getItem: () => storyVisitToken,
	setItem: () => {},
	removeItem: () => {},
};

type RefreshNoticeArgs = {
	locale: Locale;
	visitStatus: VisitStatus;
	refreshIntervalSeconds: number;
	showReloadCountdown: boolean;
};

function SeededRefreshNotice({
	locale,
	visitStatus,
	refreshIntervalSeconds,
	showReloadCountdown,
}: RefreshNoticeArgs) {
	const store = new RootStore({
		visit: {
			storage: tokenStorage,
			refreshIntervalMs: refreshIntervalSeconds * 1_000,
			lookupCurrentVisit: () =>
				Promise.resolve({
					found: true,
					visit: {
						id: 'story-visit',
						marketEventId: 'story-market',
						status: visitStatus,
						queuePosition: 7,
						aheadOfYou: 6,
						nowCalling: 1,
					},
				}),
		},
	});

	store.translations.setLanguage(locale);
	void store.visit.refresh();

	return (
		<StaticLDProvider flags={{ [RELOAD_COUNTDOWN_FLAG_KEY]: showReloadCountdown }}>
			<RootStoreProvider store={store}>
				<VisitRefreshNotice />
			</RootStoreProvider>
		</StaticLDProvider>
	);
}

const meta = {
	title: 'Guest/Session States/VisitRefreshNotice',
	component: SeededRefreshNotice,
	parameters: { shell: 'guest' },
	argTypes: {
		visitStatus: {
			control: 'select',
			options: ['registered', 'waiting', 'called', 'served', 'not_placed', 'no_show', 'cancelled'],
		},
	},
	args: {
		locale: 'en',
		visitStatus: 'waiting',
		refreshIntervalSeconds: 15,
		showReloadCountdown: true,
	},
} satisfies Meta<typeof SeededRefreshNotice>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Waiting in the queue, counting down to the next background update. */
export const Waiting: Story = {
	play: async ({ canvas }) => {
		await expect(
			await canvas.findByText(translations.en.guestView.refreshNotice.noNeedToRefresh),
		).toBeInTheDocument();
	},
};

/** A long interval, so the countdown is easy to watch tick down. */
export const SlowRefresh: Story = {
	args: { refreshIntervalSeconds: 60 },
};

/** Nothing is pending once the visit is over, so the notice removes itself. */
export const Served: Story = {
	args: { visitStatus: 'served' },
	play: async ({ canvas }) => {
		await expect(
			canvas.queryByText(translations.en.guestView.refreshNotice.noNeedToRefresh),
		).toBeNull();
	},
};

/** With the `show-reload-countdown` flag off — its default — the notice never renders. */
export const FlagOff: Story = {
	args: { showReloadCountdown: false },
	play: async ({ canvas }) => {
		await expect(
			canvas.queryByText(translations.en.guestView.refreshNotice.noNeedToRefresh),
		).toBeNull();
	},
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	globals: { locale: 'ar' },
};
