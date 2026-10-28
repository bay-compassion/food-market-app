import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { expect, within } from 'storybook/test';

import { translations, type Locale } from '../../../locales';
import { StorageService } from '../../../services/storage.service';
import { RootStoreProvider } from '../../../stores/react/store-context';
import { RootStore } from '../../../stores/root.store';
import {
	ANDROID_HOME_SCREEN_INSTALL_FLAG_KEY,
	IOS_HOME_SCREEN_INSTALL_FLAG_KEY,
} from '../../hooks/use-home-screen-install-enabled';
import { StaticLDProvider } from '../../StaticLDProvider';
import { NotificationToasts } from '../../ui/NotificationToasts';
import { MemoryStorage } from '../memory-storage.fixture';
import { HomeScreenOffer } from './HomeScreenOffer';

type Args = {
	mode: 'ios' | 'native' | 'installed' | 'unsupported' | 'desktop';
	androidEnabled: boolean;
	iosEnabled: boolean;
};

function Preview({ mode, locale, androidEnabled, iosEnabled }: Args & { locale: Locale }) {
	const [store] = useState(() => {
		const events = new EventTarget();
		const root = new RootStore({
			storage: new StorageService(new MemoryStorage()),
			installation: {
				environment: {
					platform:
						mode === 'ios' || mode === 'installed'
							? 'ios'
							: mode === 'native'
								? 'android'
								: 'other',
					events,
					displayMode: null,
					isStandalone: mode === 'installed',
					canInstallOnIos: mode === 'ios' || mode === 'installed',
					prepareHandoff: () => true,
					clearHandoff: () => undefined,
					registerServiceWorker: () => undefined,
				},
			},
			visit: {
				storage: {
					getItem: () => 'story-token',
					setItem: () => undefined,
					removeItem: () => undefined,
				},
				lookupCurrentVisit: () =>
					Promise.resolve({
						found: true,
						visit: {
							id: 'story',
							marketEventId: 'story-market',
							status: 'registered',
							queuePosition: null,
							priorityNumber: null,
							aheadOfYou: null,
							nowCalling: null,
							called: [],
							calledPriority: [],
							calledAt: null,
						},
					}),
			},
		});

		root.translations.setLanguage(locale);
		root.installation.start();

		if (mode === 'native' || mode === 'desktop') {
			events.dispatchEvent(
				Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
					prompt: () => Promise.resolve(),
					userChoice: Promise.resolve({ outcome: 'dismissed' as const }),
				}),
			);
		}

		return root;
	});

	useEffect(() => {
		void store.visit.refresh();

		return () => store[Symbol.dispose]();
	}, [store]);

	return (
		<RootStoreProvider store={store}>
			<StaticLDProvider
				flags={{
					[ANDROID_HOME_SCREEN_INSTALL_FLAG_KEY]: androidEnabled,
					[IOS_HOME_SCREEN_INSTALL_FLAG_KEY]: iosEnabled,
				}}
			>
				<HomeScreenOffer />
			</StaticLDProvider>
			<NotificationToasts />
		</RootStoreProvider>
	);
}

const meta = {
	title: 'Guest/Visit/Add to Home Screen',
	parameters: { shell: 'guest' },
	args: { mode: 'ios', androidEnabled: true, iosEnabled: true },
	render: (args, context) => (
		<Preview
			key={`${args.mode}-${context.globals.locale}`}
			{...args}
			locale={context.globals.locale as Locale}
		/>
	),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

export const IPhone: Story = {
	play: async ({ canvas, userEvent, globals }) => {
		const copy = translations[globals.locale as Locale].guestView.homeScreen;

		await userEvent.click(await canvas.findByRole('button', { name: copy.add }));
		const sheet = await within(document.body).findByRole('dialog');

		await expect(within(sheet).getByText(copy.openStep)).toBeInTheDocument();
		await userEvent.click(within(sheet).getByRole('button', { name: copy.done }));
		await expect(within(document.body).queryByRole('dialog')).not.toBeInTheDocument();
	},
};
export const NativePrompt: Story = {
	args: { mode: 'native' },
	play: async ({ canvas, userEvent, globals }) => {
		const copy = translations[globals.locale as Locale].guestView.homeScreen;

		await userEvent.click(await canvas.findByRole('button', { name: copy.add }));
		await expect(canvas.queryByRole('complementary')).not.toBeInTheDocument();
	},
};
export const AlreadyInstalled: Story = {
	args: { mode: 'installed' },
	play: async ({ canvas }) => {
		await expect(canvas.queryByRole('complementary')).not.toBeInTheDocument();
	},
};
export const UnsupportedBrowser: Story = { args: { mode: 'unsupported' } };
export const Dismissed: Story = {
	play: async ({ canvas, userEvent, globals }) => {
		await userEvent.click(
			await canvas.findByRole('button', {
				name: translations[globals.locale as Locale].guestView.homeScreen.notNow,
			}),
		);
		await expect(canvas.queryByRole('complementary')).not.toBeInTheDocument();
	},
};

export const RightToLeft: Story = { ...IPhone, globals: { locale: 'ar' } };

export const FlagsOff: Story = {
	args: { androidEnabled: false, iosEnabled: false },
	play: async ({ canvas }) => {
		await expect(canvas.queryByRole('complementary')).not.toBeInTheDocument();
	},
};
export const AndroidOnlyOnIPhone: Story = {
	...FlagsOff,
	args: { androidEnabled: true, iosEnabled: false },
};
export const IPhoneOnlyOnAndroid: Story = {
	...FlagsOff,
	args: { mode: 'native', androidEnabled: false, iosEnabled: true },
};
export const DesktopBrowser: Story = { ...FlagsOff, args: { mode: 'desktop' } };
