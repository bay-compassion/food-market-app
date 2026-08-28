import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { provide } from 'vue';

import { translations, type Locale } from '../../locales';
import { visitStatuses, type VisitStatus } from '../../services/visitStateMachine';
import { guestVisitStatusLabel } from '../../services/visitStatusLabels';
import { RootStore, rootStoreKey } from '../../stores/root.store';
import type { Language } from '../../stores/translation.store';
import Card from '../ui/layout/Card.vue';
import GuestVisitStatus from './GuestVisitStatus.vue';

/**
 * `GuestView` is a container: it owns `localStorage`, polling timers, and a router, none of which
 * can be made to hold several different states at once inside one page. What a guest actually sees
 * once a visit exists is `GuestVisitStatus` inside `Card`'s shell, driven entirely by
 * `VisitStatus` — this story renders one side by side per named status, the same way
 * `QueueGuestRow.stories.ts`'s `EachStatus` story does for the admin queue row. See
 * `GuestVisitStatus.stories.ts` for each status on its own with full controls.
 *
 * `GuestVisitStatus` reads its visit from `RootStore` rather than taking it as props, so each row
 * below gets its own store — seeded through a mocked `/api/visit` — provided to just that row.
 */

const visitTokenStorageKey = 'bay-compassion.visit-token';
const originalFetch = window.fetch.bind(window);

type GuestViewArgs = {
	locale: Locale;
};

/** One `GuestVisitStatus`, backed by its own `RootStore` seeded to a single fixed visit status. */
function visitStatusRow(
	row: { status: VisitStatus; queuePosition: number | null; aheadOfYou: number | null },
	locale: Locale,
) {
	window.localStorage.setItem(visitTokenStorageKey, `story-${row.status}`);

	const rootStore = new RootStore();

	rootStore.translations.setLanguage(locale as Language);

	window.fetch = (input, init) => {
		const url = String(input instanceof Request ? input.url : input);

		if (url !== '/api/visit') {
			return originalFetch(input, init);
		}

		return Promise.resolve(
			Response.json({
				id: `story-${row.status}`,
				status: row.status,
				queuePosition: row.queuePosition,
				aheadOfYou: row.aheadOfYou,
			}),
		);
	};
	void rootStore.visit.refresh();

	const t = translations[locale];

	return {
		components: { Card, GuestVisitStatus },
		setup() {
			provide(rootStoreKey, rootStore);

			return { t };
		},
		template: `
			<section class="guest-layout" style="width: auto; padding: 0;">
				<Card aria-live="polite">
					<GuestVisitStatus :success-title="t.successTitle" :success-description="t.successDescription" />
				</Card>
			</section>
		`,
	};
}

const meta: Meta<GuestViewArgs> = {
	title: 'Guest/Session States/All',
	parameters: {
		shell: 'guest',
		viewport: {
			options: {
				fill: {
					name: 'Fill',
					styles: { width: '100%', height: '100%' },
					type: 'desktop',
				},
			},
		},
	},
	globals: { viewport: { value: 'fill' } },
	args: {
		locale: 'en',
	},
};

export default meta;

type Story = StoryObj<GuestViewArgs>;

/** Every named `VisitStatus`, side by side. */
export const AllStates: Story = {
	parameters: { controls: { disable: true } },
	render: (args) => ({
		components: { Card, GuestVisitStatus },
		setup() {
			const rows = visitStatuses.map((status) => {
				const queuePosition = status === 'waiting' ? 7 : null;
				const aheadOfYou = status === 'waiting' ? 6 : null;

				return {
					status,
					label: guestVisitStatusLabel(args.locale, status),
					component: visitStatusRow({ status, queuePosition, aheadOfYou }, args.locale),
				};
			});

			return { rows };
		},
		template: `
			<div style="display: flex; gap: 24px; align-items: flex-start; margin: 0 24px;">
				<div v-for="row in rows" :key="row.status" style="flex: 0 0 300px;">
					<h2 style="margin: 0 0 12px; font-size: 15px; color: var(--color-text-subtle);">
						{{ row.label }}
					</h2>
					<component :is="row.component" />
				</div>
			</div>
		`,
	}),
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	...AllStates,
	globals: { locale: 'ar' },
};
