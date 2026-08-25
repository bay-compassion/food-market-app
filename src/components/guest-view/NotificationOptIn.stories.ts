import type { Decorator, Meta, StoryObj } from '@storybook/vue3-vite';
import { expect } from 'storybook/test';

import { translations, type Locale } from '../../locales';
import NotificationOptIn from './NotificationOptIn.vue';

/**
 * There is no backend behind Storybook, so `NotificationOptIn`'s own `fetch` calls to
 * `/api/push-subscription` and `/api/sms-subscription` are stubbed here, keyed off the
 * `pushConfigured`/`smsConfigured` args so a story can show either channel on its own or both
 * together. Unknown URLs fall through to the real `fetch`.
 *
 * Actually enabling push notifications still will not complete here: that needs a service worker
 * and a real subscription endpoint. The stub is for laying out the panel, not exercising that
 * part of the flow — see `NotificationOptIn.test.ts` for that coverage. Enabling SMS does
 * complete, since it is a plain POST with no browser API involved.
 */
const originalFetch = window.fetch.bind(window);

const withNotificationEndpoints: Decorator = (story, context) => {
	window.fetch = (input, init) => {
		const url = String(input instanceof Request ? input.url : input);

		if (url === '/api/push-subscription') {
			return Promise.resolve(
				Response.json({
					configured: context.args.pushConfigured,
					publicKey: context.args.pushConfigured ? 'story-public-key' : null,
				}),
			);
		}
		if (url === '/api/sms-subscription') {
			if (init?.method === 'POST') {
				return Promise.resolve(Response.json({ subscribed: true }));
			}

			return Promise.resolve(
				Response.json({
					configured: context.args.smsConfigured,
					subscribed: context.args.smsSubscribed,
				}),
			);
		}

		return originalFetch(input, init);
	};

	return story();
};

type NotificationOptInArgs = {
	locale: Locale;
	pushConfigured: boolean;
	smsConfigured: boolean;
	/** Whether the guest already has active consent from some past visit — the server-side check
	 *  that lets a returning guest skip the checkbox entirely. */
	smsSubscribed: boolean;
};

/**
 * The consent label shares its `<span>` with the inline Privacy Policy / Terms links, so the
 * element's own `textContent` is the label plus both link labels concatenated — never an exact
 * match for the label alone. This finds the innermost element whose text contains the label,
 * the standard testing-library recipe for text split across markup.
 */
function consentTextMatcher(label: string) {
	return (_: string, element: Element | null) => {
		if (!element || !(element.textContent ?? '').includes(label)) {
			return false;
		}

		return Array.from(element.children).every(
			(child) => !(child.textContent ?? '').includes(label),
		);
	};
}

const meta: Meta<NotificationOptInArgs> = {
	title: 'Guest/NotificationOptIn',
	component: NotificationOptIn,
	parameters: { shell: 'guest' },
	decorators: [withNotificationEndpoints],
	args: {
		locale: 'en',
		pushConfigured: true,
		smsConfigured: true,
		smsSubscribed: false,
	},
	render: (args) => ({
		components: { NotificationOptIn },
		setup: () => ({ args }),
		template: `
			<div class="checkin-card" style="max-width: 360px;">
				<NotificationOptIn visit-token="story-visit-token" :locale="args.locale" />
			</div>
		`,
	}),
};

export default meta;

type Story = StoryObj<NotificationOptInArgs>;

/**
 * The SMS opt-in checkbox — the same checkbox and consent copy a guest sees after registering for
 * a visit, and the screen that has to double as proof of consent for the SMS provider's campaign
 * review, so its exact wording matters as much here as it does live.
 */
export const Default: Story = {
	play: async ({ canvas }) => {
		await expect(
			await canvas.findByText(consentTextMatcher(translations.en.smsConsentLabel)),
		).toBeInTheDocument();
		await expect(
			canvas.getByRole('button', { name: translations.en.smsEnable }),
		).toBeInTheDocument();
	},
};

/** Only SMS is configured — the screen a reviewer needs to see, with no push clutter around it. */
export const SmsOnly: Story = {
	args: { pushConfigured: false },
};

/** A guest who has checked the box and confirmed — the enrollment confirmation state. */
export const SmsConsentGiven: Story = {
	args: { pushConfigured: false },
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(await canvas.findByRole('checkbox'));
		await userEvent.click(canvas.getByRole('button', { name: translations.en.smsEnable }));

		await expect(await canvas.findByText(translations.en.smsEnabled)).toBeInTheDocument();
	},
};

/**
 * A returning guest who already consented on a past visit — consent is a guest characteristic,
 * not a per-visit one, so this skips straight to the confirmation instead of asking again.
 */
export const AlreadySubscribed: Story = {
	args: { pushConfigured: false, smsSubscribed: true },
	play: async ({ canvas }) => {
		await expect(await canvas.findByText(translations.en.smsEnabled)).toBeInTheDocument();
		expect(canvas.queryByRole('checkbox')).not.toBeInTheDocument();
	},
};

/** Neither channel is configured, so the component renders nothing rather than an empty card. */
export const Unconfigured: Story = {
	args: { pushConfigured: false, smsConfigured: false },
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	args: { pushConfigured: false },
	globals: { locale: 'ar' },
	play: async ({ canvas }) => {
		await expect(
			await canvas.findByText(consentTextMatcher(translations.ar.smsConsentLabel)),
		).toBeInTheDocument();
	},
};
