import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { translations } from '../../locales';
import { StorageKey } from '../../services/storage.service';
import type { GuestIdentity } from '../../stores/guest.store';
import { GuestIdentityIndicator } from './GuestIdentityIndicator';

type GuestIdentityIndicatorArgs = {
	identity: GuestIdentity;
	/** Read by the decorator's stubbed `/api/notification-status`, not by the component. */
	smsSubscribed: boolean;
};

/** The indicator plus the arg the stubbed endpoint reads, so both drive the controls panel. */
function Indicator({ identity }: GuestIdentityIndicatorArgs) {
	return <GuestIdentityIndicator identity={identity} />;
}

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

const withNotificationEndpoints: Decorator = (Story, context) => {
	const args = context.args as GuestIdentityIndicatorArgs;

	window.fetch = (input, init) => {
		const url = String(input instanceof Request ? input.url : input);

		if (url === '/api/push-subscription') {
			return Promise.resolve(Response.json({ configured: false, publicKey: null }));
		}

		if (url === '/api/sms-subscription') {
			return Promise.resolve(Response.json({ configured: true }));
		}

		if (url === '/api/notification-status') {
			return Promise.resolve(
				Response.json({ pushSubscribed: false, smsConsented: args.smsSubscribed }),
			);
		}

		return originalFetch(input, init);
	};

	return <Story />;
};

const meta = {
	title: 'Guest/Identity Indicator',
	component: Indicator,
	tags: ['autodocs'],
	parameters: {
		shell: 'guest',
		docs: {
			description: {
				component:
					'Indicates that this browser has identified a guest. It displays only the name and phone number saved in client-side storage and never retrieves guest profile data from the server.',
			},
		},
	},
	decorators: [withNotificationEndpoints],
	args: {
		smsSubscribed: false,
		identity: {
			firstName: 'Ari',
			lastName: 'Guest',
			phone: '(555) 123-4567',
		},
	},
} satisfies Meta<typeof Indicator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvas, userEvent }) => {
		const copy = translations.en.guestView.identityIndicator;

		await expect(canvas.getByText(copy.heading)).toBeInTheDocument();
		await expect(canvas.getByText('Ari G')).toBeInTheDocument();
		await expect(canvas.getByText('(555) 123-4567')).toBeInTheDocument();

		const notificationsButton = await canvas.findByRole('button', {
			name: copy.notificationsAction,
		});

		await expect(notificationsButton).toBeInTheDocument();

		await userEvent.click(notificationsButton);

		await expect(
			await canvas.findByRole('heading', { name: copy.notificationsDialogTitle }),
		).toBeInTheDocument();
		await expect(await canvas.findByRole('checkbox')).toBeInTheDocument();
		await expect(
			canvas.getByText((_, element) => {
				const text = element?.textContent ?? '';

				return (
					text.includes(translations.en.smsConsentLabel) &&
					!Array.from(element?.children ?? []).some((child) =>
						(child.textContent ?? '').includes(translations.en.smsConsentLabel),
					)
				);
			}),
		).toBeInTheDocument();

		const consent = canvas.getByRole('checkbox');
		const approve = canvas.getByRole('button', { name: translations.en.smsEnable });

		await expect(approve).toBeDisabled();
		await userEvent.click(consent);
		await expect(approve).toBeEnabled();
		await userEvent.click(approve);

		await expect(await canvas.findByText(copy.notificationsEnabled)).toBeInTheDocument();
		await expect(
			canvas.queryByRole('heading', { name: copy.notificationsDialogTitle }),
		).not.toBeInTheDocument();
	},
};

export const NotificationsEnabled: Story = {
	args: { smsSubscribed: true },
	play: async ({ canvas }) => {
		const copy = translations.en.guestView.identityIndicator;

		await expect(await canvas.findByText(copy.notificationsEnabled)).toBeInTheDocument();
		await expect(
			canvas.queryByRole('button', { name: copy.notificationsAction }),
		).not.toBeInTheDocument();
	},
};

/** Right-to-left rendering for Arabic and Farsi locales. */
export const RightToLeft: Story = {
	globals: { locale: 'ar' },
	play: async ({ canvas }) => {
		await expect(
			canvas.getByText(translations.ar.guestView.identityIndicator.heading),
		).toBeInTheDocument();
		await expect(canvas.getByText('Ari G')).toBeInTheDocument();
		await expect(canvas.getByText('(555) 123-4567')).toBeInTheDocument();
	},
};
