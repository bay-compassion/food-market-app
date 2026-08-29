import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { translations } from '../../locales';
import { StorageKey } from '../../services/storage.service';
import { NotificationOptIn } from './NotificationOptIn';

/**
 * There is no backend behind Storybook, so the guest store's notification endpoint calls are
 * stubbed here. Push remains configured in the store to verify that its controls stay hidden;
 * `smsConfigured` controls the only channel currently shown to guests.
 *
 * Actually enabling push notifications still will not complete here: that needs a service worker
 * and a real subscription endpoint. The stub is for laying out the panel, not exercising that
 * part of the flow — see `NotificationOptIn.test.tsx` for that coverage. Enabling SMS does
 * complete, since it is a plain POST with no browser API involved.
 */
/*
 * Seeded at module scope, not in the decorator below: the preview builds the story's `RootStore`
 * in a decorator of its own that wraps this one, and `GuestStore` reads the device token in its
 * constructor — by the time a story-level decorator runs, the store already exists without it.
 */
window.localStorage.setItem(
	StorageKey.GUEST_DEVICE_TOKEN,
	JSON.stringify('story-device-token'.padEnd(32, 'x')),
);

const originalFetch = window.fetch.bind(window);

type NotificationOptInArgs = {
	smsConfigured: boolean;
	/** Whether this phone already has active consent from a past visit — the server-side check
	 *  that lets the guest skip the checkbox entirely. */
	smsSubscribed: boolean;
};

const withNotificationEndpoints: Decorator = (Story, context) => {
	const args = context.args as NotificationOptInArgs;

	window.fetch = (input, init) => {
		const url = String(input instanceof Request ? input.url : input);

		if (url === '/api/push-subscription') {
			return Promise.resolve(Response.json({ configured: true, publicKey: 'story-public-key' }));
		}

		if (url === '/api/sms-subscription') {
			if (init?.method === 'POST') {
				return Promise.resolve(Response.json({ subscribed: true }));
			}

			return Promise.resolve(Response.json({ configured: args.smsConfigured }));
		}

		if (url === '/api/notification-status') {
			return Promise.resolve(
				Response.json({ pushSubscribed: false, smsConsented: args.smsSubscribed }),
			);
		}

		return originalFetch(input, init);
	};

	return (
		<div style={{ maxWidth: '360px' }}>
			<Story />
		</div>
	);
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

const meta = {
	title: 'Guest/NotificationOptIn',
	component: NotificationOptIn,
	parameters: { shell: 'guest' },
	decorators: [withNotificationEndpoints],
	args: {
		smsConfigured: true,
		smsSubscribed: false,
	},
} satisfies Meta<NotificationOptInArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

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
