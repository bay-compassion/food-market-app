import type { Decorator, Meta, StoryObj } from '@storybook/vue3-vite';
import { expect } from 'storybook/test';

import { translations, type Locale } from '../../locales';
import { StorageKey } from '../../services/storage.service';
import { GuestStore } from '../../stores/guest.store';
import NotificationOptIn from './NotificationOptIn.vue';

/**
 * There is no backend behind Storybook, so the guest store's notification endpoint calls are
 * stubbed here. Push remains configured in the store to verify that its controls stay hidden;
 * `smsConfigured` controls the only channel currently shown to guests.
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
					configured: true,
					publicKey: 'story-public-key',
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
				}),
			);
		}

		if (url === '/api/notification-status') {
			return Promise.resolve(
				Response.json({ pushSubscribed: false, smsConsented: context.args.smsSubscribed }),
			);
		}

		return originalFetch(input, init);
	};

	return story();
};

type NotificationOptInArgs = {
	locale: Locale;
	smsConfigured: boolean;
	/** Whether this phone already has active consent from a past visit — the server-side check
	 *  that lets the guest skip the checkbox entirely. */
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
		smsConfigured: true,
		smsSubscribed: false,
	},
	render: (args) => ({
		components: { NotificationOptIn },
		setup: () => ({
			args,
			guest: new GuestStore({
				storage: {
					get: (key: string) =>
						key === StorageKey.GUEST_DEVICE_TOKEN ? 'story-device-token'.padEnd(32, 'x') : null,
					set: () => undefined,
					remove: () => undefined,
				},
			}),
		}),
		template: `
			<div style="max-width: 360px;">
				<NotificationOptIn
					:guest="guest"
					:locale="args.locale"
				/>
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

/** A guest who has checked the box and confirmed — the enrollment confirmation state. */
export const SmsConsentGiven: Story = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(await canvas.findByRole('checkbox'));
		await userEvent.click(canvas.getByRole('button', { name: translations.en.smsEnable }));

		await expect(await canvas.findByText(translations.en.smsEnabled)).toBeInTheDocument();
	},
};

/**
 * A guest whose phone already consented on a past visit, so this skips straight to confirmation
 * instead of asking again.
 */
export const AlreadySubscribed: Story = {
	args: { smsSubscribed: true },
	play: async ({ canvas }) => {
		await expect(await canvas.findByText(translations.en.smsEnabled)).toBeInTheDocument();
		await expect(canvas.queryByRole('checkbox')).not.toBeInTheDocument();
	},
};

/** Neither channel is configured, so the component renders nothing rather than an empty card. */
export const Unconfigured: Story = {
	args: { smsConfigured: false },
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	globals: { locale: 'ar' },
	play: async ({ canvas }) => {
		await expect(
			await canvas.findByText(consentTextMatcher(translations.ar.smsConsentLabel)),
		).toBeInTheDocument();
	},
};
