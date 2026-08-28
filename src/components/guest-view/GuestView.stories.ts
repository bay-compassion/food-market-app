import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, reactive } from 'vue';

import { translations, type Locale } from '../../locales';
import { visitStatuses } from '../../services/visitStateMachine';
import { guestVisitStatusLabel } from '../../services/visitStatusLabels';
import Card from '../ui/layout/Card.vue';
import GuestVisitStatus from './GuestVisitStatus.vue';

/**
 * `GuestView` is a container: it owns `localStorage`, polling timers, and a router, none of which
 * can be made to hold several different states at once inside one page. What a guest actually sees
 * once a visit exists is `GuestVisitStatus` inside `Card`'s shell, driven entirely by
 * `VisitStatus` — this story renders one side by side per named status, the same way
 * `QueueGuestRow.stories.ts`'s `EachStatus` story does for the admin queue row. See
 * `GuestVisitStatus.stories.ts` for each status on its own with full controls.
 */

type GuestViewArgs = {
	locale: Locale;
};

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
			const rows = reactive(
				visitStatuses.map((status) => ({
					status,
					queuePosition: status === 'waiting' ? 7 : null,
					aheadOfYou: status === 'waiting' ? 6 : null,
				})),
			);

			return {
				args,
				rows,
				t: computed(() => translations[args.locale]),
				labelFor: (status: (typeof visitStatuses)[number]) =>
					guestVisitStatusLabel(args.locale, status),
			};
		},
		template: `
			<div style="display: flex; gap: 24px; align-items: flex-start; margin: 0 24px;">
				<div v-for="row in rows" :key="row.status" style="flex: 0 0 300px;">
					<h2 style="margin: 0 0 12px; font-size: 15px; color: var(--color-text-subtle);">
						{{ labelFor(row.status) }}
					</h2>
					<section class="guest-layout" style="width: auto; padding: 0;">
						<Card aria-live="polite">
							<GuestVisitStatus
								:t="t"
								:is-called="row.status === 'called'"
								:success-title="t.successTitle"
								:success-description="t.successDescription"
								:visit-status-label="labelFor(row.status)"
								:queue-position="row.queuePosition"
								:guests-ahead="row.aheadOfYou"
								:can-cancel-visit="row.status === 'registered' || row.status === 'waiting'"
								:is-cancelling="false"
								submission-error=""
							/>
						</Card>
					</section>
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
