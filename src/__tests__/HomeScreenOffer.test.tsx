import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AppThemeProvider } from '../components/AppThemeProvider';
import { HomeScreenOffer } from '../components/guest-view/home-screen/HomeScreenOffer';
import { HOME_SCREEN_INSTALL_FLAG_KEY } from '../components/hooks/use-home-screen-install-enabled';
import { StaticLDProvider } from '../components/StaticLDProvider';
import { translations } from '../locales';
import { StorageKey, StorageService } from '../services/storage.service';
import { RootStoreProvider } from '../stores/react/store-context';
import { RootStore } from '../stores/root.store';

const stores: RootStore[] = [];

beforeEach(() => localStorage.clear());
afterEach(() => {
	for (const store of stores.splice(0)) {
		store[Symbol.dispose]();
	}
});

describe('HomeScreenOffer rollout', () => {
	it('closes instructions when the flag turns off and does not treat that as dismissal', async () => {
		// Arrange
		const user = userEvent.setup();
		const copy = translations.en.guestView.homeScreen;
		const store = new RootStore({
			installation: {
				environment: {
					platform: 'ios',
					events: new EventTarget(),
					displayMode: null,
					isStandalone: false,
					canInstallOnIos: true,
					prepareHandoff: () => true,
					clearHandoff: () => undefined,
					registerServiceWorker: () => undefined,
				},
			},
			visit: {
				storage: {
					getItem: () => 'test-token',
					setItem: () => undefined,
					removeItem: () => undefined,
				},
				lookupCurrentVisit: () =>
					Promise.resolve({
						found: true,
						visit: {
							id: 'visit',
							marketEventId: 'market',
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

		stores.push(store);
		store.translations.setLanguage('en');
		store.installation.start();
		await store.visit.refresh();
		const tree = (enabled: boolean) => (
			<AppThemeProvider>
				<RootStoreProvider store={store}>
					<StaticLDProvider flags={{ [HOME_SCREEN_INSTALL_FLAG_KEY]: enabled }}>
						<HomeScreenOffer />
					</StaticLDProvider>
				</RootStoreProvider>
			</AppThemeProvider>
		);
		const { rerender } = render(tree(true));

		await user.click(screen.getByRole('button', { name: copy.add }));
		expect(screen.getByRole('dialog')).toBeTruthy();

		// Act
		rerender(tree(false));

		// Assert
		await waitFor(() => expect(store.installation.instructionsOpen).toBe(false));
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(screen.queryByRole('complementary')).toBeNull();
		expect(new StorageService().get(StorageKey.PWA_INSTALL_DISMISSED_UNTIL)).toBeNull();
		rerender(tree(true));
		expect(await screen.findByRole('button', { name: copy.add })).toBeTruthy();
		expect(screen.queryByRole('dialog')).toBeNull();
	});
});
