import type { Decorator, Meta, StoryObj } from '@storybook/vue3-vite';
import { expect } from 'storybook/test';

import { translations, type Locale } from '../../locales';
import type { GuestIdentity } from '../../services/guest.store';
import GuestIdentityIndicator from './GuestIdentityIndicator.vue';

type GuestIdentityIndicatorArgs = {
	locale: Locale;
	identity: GuestIdentity;
	smsSubscribed: boolean;
};

const originalFetch = window.fetch.bind(window);

const withNotificationEndpoints: Decorator = (story, context) => {
	window.localStorage.setItem(
		'bay-compassion.guest-device-token',
		JSON.stringify('story-device-token'.padEnd(32, 'x')),
	);

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
				Response.json({ pushSubscribed: false, smsConsented: context.args.smsSubscribed }),
			);
		}

		return originalFetch(input, init);
	};

	return story();
};

const meta: Meta<GuestIdentityIndicatorArgs> = {
	title: 'Guest/Identity Indicator',
	component: GuestIdentityIndicator,
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
		locale: 'en',
		smsSubscribed: false,
		identity: {
			firstName: 'Ari',
			lastName: 'Guest',
			phone: '(555) 123-4567',
		},
	},
	render: (args) => ({
		components: { GuestIdentityIndicator },
		setup() {
			return { args, t: translations[args.locale] };
		},
		template: `
			<GuestIdentityIndicator
				:identity="args.identity"
				:t="t"
				:locale="args.locale"
			/>
		`,
	}),
};

export default meta;
type Story = StoryObj<GuestIdentityIndicatorArgs>;

export const Default: Story = {
	play: async ({ canvas, userEvent }) => {
		await expect(
			canvas.getByText(translations.en.guestView.identityIndicator.heading),
		).toBeInTheDocument();
		await expect(canvas.getByText('Ari G')).toBeInTheDocument();
		await expect(canvas.getByText('(555) 123-4567')).toBeInTheDocument();

		const notificationsButton = await canvas.findByRole('button', {
			name: translations.en.guestView.identityIndicator.notificationsAction,
		});

		await expect(notificationsButton).toBeInTheDocument();

		await userEvent.click(notificationsButton);

		await expect(
			await canvas.findByRole('heading', {
				name: translations.en.guestView.identityIndicator.notificationsDialogTitle,
			}),
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

		await expect(
			await canvas.findByText(translations.en.guestView.identityIndicator.notificationsEnabled),
		).toBeInTheDocument();
		await expect(
			canvas.queryByRole('heading', {
				name: translations.en.guestView.identityIndicator.notificationsDialogTitle,
			}),
		).not.toBeInTheDocument();
	},
};

export const NotificationsEnabled: Story = {
	args: { smsSubscribed: true },
	play: async ({ canvas }) => {
		await expect(
			await canvas.findByText(translations.en.guestView.identityIndicator.notificationsEnabled),
		).toBeInTheDocument();
		await expect(
			canvas.queryByRole('button', {
				name: translations.en.guestView.identityIndicator.notificationsAction,
			}),
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
