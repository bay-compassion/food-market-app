import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { translations } from '../../locales';
import { StorageKey } from '../../services/storage.service';
import { NotificationOptIn } from './NotificationOptIn';

/**
 * There is no backend behind Storybook, so the guest store's notification endpoint calls are
 * stubbed here. Push remains configured in the store to verify that its controls stay hidden, and
 * SMS remains available so the story represents the dialog's one reachable opt-in state.
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

const withNotificationEndpoints: Decorator = (Story) => {
	window.fetch = (input, init) => {
		const url = String(input instanceof Request ? input.url : input);

		if (url === '/api/push-subscription') {
			return Promise.resolve(Response.json({ configured: true, publicKey: 'story-public-key' }));
		}

		if (url === '/api/sms-subscription') {
			return Promise.resolve(Response.json({ configured: true }));
		}

		if (url === '/api/notification-status') {
			return Promise.resolve(Response.json({ pushSubscribed: false, smsConsented: false }));
		}

		return originalFetch(input, init);
	};

	return (
		<div style={{ maxWidth: '360px' }}>
			<Story />
		</div>
	);
};

const meta = {
	title: 'Guest/Identity/NotificationOptIn',
	component: NotificationOptIn,
	parameters: { shell: 'guest' },
	decorators: [withNotificationEndpoints],
} satisfies Meta<typeof NotificationOptIn>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The SMS opt-in checkbox — the same checkbox and consent copy a guest sees after registering for
 * a visit, and the screen that has to double as proof of consent for the SMS provider's campaign
 * review, so its exact wording matters as much here as it does live.
 */
export const Default: Story = {
	play: async ({ canvas }) => {
		await expect(await canvas.findByText(translations.en.smsConsentLabel)).toBeInTheDocument();
		const legalLinks = canvas.getByText(translations.en.privacyPolicy).parentElement;

		await expect(legalLinks).toHaveClass('notification-legal-links');
		await expect(getComputedStyle(legalLinks!).display).toBe('flex');
		await expect(legalLinks).toContainElement(
			canvas.getByRole('link', { name: translations.en.termsAndConditions }),
		);
		await expect(
			canvas.getByRole('button', { name: translations.en.smsEnable }),
		).toBeInTheDocument();
	},
};

/** Right-to-left rendering, which the Arabic and Farsi locales need. */
export const RightToLeft: Story = {
	globals: { locale: 'ar' },
	play: async ({ canvas }) => {
		await expect(await canvas.findByText(translations.ar.smsConsentLabel)).toBeInTheDocument();
	},
};
