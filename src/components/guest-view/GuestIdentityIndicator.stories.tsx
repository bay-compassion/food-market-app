import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { translations, type Locale } from '../../locales';
import { StorageKey, StorageService } from '../../services/storage.service';
import type { GuestIdentity } from '../../stores/guest.store';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
import { GuestIdentityIndicator } from './GuestIdentityIndicator';

type GuestIdentityIndicatorArgs = {
	locale: Locale;
	identity: GuestIdentity | null;
	deviceToken: string | null;
	/** Read by the decorator's stubbed `/api/notification-status`, not by the component. */
	smsSubscribed: boolean;
	forceDisableSms: boolean;
	notificationStatus: 'success' | 'loading' | 'error';
};

class MemoryStorage implements Storage {
	private readonly values = new Map<string, string>();

	get length() {
		return this.values.size;
	}

	clear() {
		this.values.clear();
	}

	getItem(key: string) {
		return this.values.get(key) ?? null;
	}

	key(index: number) {
		return Array.from(this.values.keys())[index] ?? null;
	}

	removeItem(key: string) {
		this.values.delete(key);
	}

	setItem(key: string, value: string) {
		this.values.set(key, value);
	}
}

/** Provides the component with the same seeded store shape it receives in the running app. */
const withGuestStore: Decorator = (Story, context) => {
	const { deviceToken, identity, locale, forceDisableSms } =
		context.args as GuestIdentityIndicatorArgs;
	const storage = new StorageService(new MemoryStorage());

	if (deviceToken) {
		storage.set(StorageKey.GUEST_DEVICE_TOKEN, deviceToken);
	}

	if (identity) {
		storage.set(StorageKey.GUEST_IDENTITY, identity);
	}

	const store = new RootStore({ storage });

	store.translations.setLanguage(locale);
	store.guest.forceDisableSms = forceDisableSms;

	return (
		<RootStoreProvider store={store}>
			<Story />
		</RootStoreProvider>
	);
};

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
			if (args.notificationStatus === 'loading') {
				return new Promise<Response>(() => undefined);
			}

			if (args.notificationStatus === 'error') {
				return Promise.resolve(new Response(null, { status: 503 }));
			}

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
	component: GuestIdentityIndicator,
	tags: ['autodocs'],
	parameters: {
		shell: 'guest',
		docs: {
			description: {
				component:
					'Shows whether this browser has identified a guest. Identified guests see only the name and phone number saved in client-side storage, while unidentified guests get a path to sign up.',
			},
		},
	},
	decorators: [withGuestStore, withNotificationEndpoints],
	args: {
		locale: 'en',
		deviceToken: 'story-device-token'.padEnd(32, 'x'),
		smsSubscribed: false,
		forceDisableSms: false,
		notificationStatus: 'success',
		identity: {
			firstName: 'Ari',
			lastName: 'Guest',
			phone: '(555) 123-4567',
		},
	},
} satisfies Meta<typeof GuestIdentityIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

/** With no device credential or locally stored identity, the indicator offers preregistration. */
export const NotIdentified: Story = {
	args: { deviceToken: null, identity: null },
	play: async ({ canvas }) => {
		const copy = translations.en.guestView.identityIndicator;

		await expect(
			canvas.getByRole('complementary', { name: copy.unidentifiedHeading }),
		).toBeInTheDocument();
		await expect(canvas.getByText(copy.unidentifiedMessage)).toBeInTheDocument();
		await expect(canvas.getByRole('button', { name: copy.preregisterAction })).toBeInTheDocument();
	},
};

export const Identified: Story = {
	name: 'Identified, notifications disabled',
	play: async ({ canvas }) => {
		const copy = translations.en.guestView.identityIndicator;

		await expect(canvas.getByText(copy.heading)).toBeInTheDocument();
		await expect(canvas.getByText('Ari G')).toBeInTheDocument();
		await expect(canvas.getByText('(555) 123-4567')).toBeInTheDocument();

		const notificationsButton = await canvas.findByRole('button', {
			name: copy.notificationsAction,
		});

		await expect(notificationsButton).toBeInTheDocument();
		await expect(
			canvas.queryByRole('heading', { name: copy.notificationsDialogTitle }),
		).not.toBeInTheDocument();
	},
};

/** Interaction coverage kept out of the sidebar so the visual stories remain stable. */
export const NotificationConsentFlow: Story = {
	tags: ['!dev'],
	play: async ({ canvas, userEvent }) => {
		const copy = translations.en.guestView.identityIndicator;
		const notificationsButton = await canvas.findByRole('button', {
			name: copy.notificationsAction,
		});

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

export const NotificationsLoading: Story = {
	args: { notificationStatus: 'loading' },
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('status')).toHaveTextContent(
			translations.en.guestView.identityIndicator.notificationsLoading,
		);
	},
};

export const NotificationsError: Story = {
	args: { notificationStatus: 'error' },
	play: async ({ canvas }) => {
		await expect(await canvas.findByRole('alert')).toHaveTextContent(
			translations.en.guestView.identityIndicator.notificationsError,
		);
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
