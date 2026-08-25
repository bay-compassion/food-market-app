import type { Decorator, Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, reactive } from 'vue';

import { translations, type Locale } from '../../locales';
import { visitStatuses } from '../../services/visitStateMachine';
import { guestVisitStatusLabel } from '../../services/visitStatusLabels';
import GuestSignupCard from '../GuestSignupCard.vue';
import type { GuestFormState } from '../types';

/**
 * `GuestView` is a container: it owns `localStorage`, polling timers, and a router, none of which
 * can be made to hold several different states at once inside one page. What a guest actually sees
 * once a visit exists is `GuestSignupCard` in its submitted state, driven entirely by `VisitStatus`
 * — this story renders one `GuestSignupCard` per named status, side by side, the same way
 * `QueueGuestRow.stories.ts`'s `EachStatus` story does for the admin queue row.
 */

const emptyGuest = (): GuestFormState => ({
	firstName: '',
	lastName: '',
	ageRange: '',
	householdSize: '',
	childrenCount: '',
	seniorsCount: '',
	phone: '',
});

/**
 * `NotificationOptIn`, rendered inside every success state, asks the backend whether push and SMS
 * are configured and renders nothing when it cannot tell. There is no backend behind Storybook, so
 * without this stub the states would quietly hide the opt-in.
 */
let endpointsStubbed = false;

function stubNotificationEndpoints() {
	if (endpointsStubbed) {
		return;
	}
	endpointsStubbed = true;

	const realFetch = window.fetch.bind(window);

	window.fetch = (input, init) => {
		const url = String(input instanceof Request ? input.url : input);

		if (url.includes('/api/push-subscription')) {
			return Promise.resolve(Response.json({ configured: true, publicKey: 'story-public-key' }));
		}
		if (url.includes('/api/sms-subscription')) {
			return Promise.resolve(Response.json({ configured: true }));
		}

		return realFetch(input, init);
	};
}

const withNotificationEndpoints: Decorator = (story) => {
	stubNotificationEndpoints();

	return story();
};

type GuestViewArgs = {
	locale: Locale;
};

const meta: Meta<GuestViewArgs> = {
	title: 'Guest/GuestView',
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
	decorators: [withNotificationEndpoints],
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
		components: { GuestSignupCard },
		setup() {
			const rows = reactive(
				visitStatuses.map((status) => ({
					status,
					queuePosition: status === 'waiting' ? 7 : null,
					aheadOfYou: status === 'waiting' ? 6 : null,
					guest: emptyGuest(),
					pin: '',
					pinConfirmation: '',
					registrationType: 'new' as 'new' | 'returning',
					updateProfile: false,
					registrationAnswers: {} as Record<string, string | number>,
				})),
			);
			// A fixed pair, rather than a live-ticking ref, keeps the story stable rather than
			// drifting while it sits open (see `GuestSignupCard.stories.ts` for the same convention).
			const now = Date.now();

			return {
				args,
				rows,
				now,
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
						<GuestSignupCard
							v-model:guest="row.guest"
							v-model:pin="row.pin"
							v-model:pin-confirmation="row.pinConfirmation"
							v-model:registration-type="row.registrationType"
							v-model:update-profile="row.updateProfile"
							v-model:registration-answers="row.registrationAnswers"
							:t="t"
							:locale="args.locale"
							context="queue"
							:active-visit="{
								id: 'story-visit-' + row.status,
								status: row.status,
								queuePosition: row.queuePosition,
								aheadOfYou: row.aheadOfYou,
							}"
							is-submitted
							:is-called="row.status === 'called'"
							:visit-status-label="labelFor(row.status)"
							:queue-position="row.queuePosition"
							:guests-ahead="row.aheadOfYou"
							:can-cancel-visit="row.status === 'registered' || row.status === 'waiting'"
							:is-cancelling="false"
							visit-token="story-visit-token"
							can-show-form
							:show-preregister-cta="false"
							:registration-questions="[]"
							submission-error=""
							:is-submitting="false"
							:now="now"
							:registration-closes-at="null"
						/>
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
