import type { Decorator, Meta, StoryObj } from '@storybook/vue3-vite';

import GuestNotificationCard from './GuestNotificationCard.vue';

/**
 * The card below `GuestSignupCard` that offers push/SMS opt-in once a guest is identified by a
 * visit token — shown regardless of which state `GuestSignupCard` is in above it.
 */

/**
 * `NotificationOptIn` asks the backend whether push and SMS are configured and renders nothing
 * when it cannot tell. There is no backend behind Storybook, so without this stub the story would
 * quietly hide the opt-in — the whole point of this demo.
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

type GuestNotificationCardArgs = {
	visitToken: string | null;
};

const meta: Meta<GuestNotificationCardArgs> = {
	title: 'Guest/GuestNotificationCard',
	component: GuestNotificationCard,
	parameters: { shell: 'guest' },
	decorators: [withNotificationEndpoints],
	args: {
		visitToken: 'story-visit-token',
	},
	render: (args) => ({
		components: { GuestNotificationCard },
		setup() {
			return { args };
		},
		template: `<GuestNotificationCard locale="en" :visit-token="args.visitToken" />`,
	}),
};

export default meta;

type Story = StoryObj<GuestNotificationCardArgs>;

/** A guest identified by a stored visit token sees the notification opt-in. */
export const WithNotificationOptIn: Story = {};

/** No visit token yet (e.g. a first-time guest who hasn't submitted anything) — nothing renders. */
export const WithoutVisitToken: Story = {
	args: { visitToken: null },
};
