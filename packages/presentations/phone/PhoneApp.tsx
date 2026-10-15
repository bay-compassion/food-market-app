import { createTheme, ThemeProvider, type Theme } from '@mui/material/styles';
import { observer } from 'mobx-react-lite';
import { MemoryRouter, Route, Routes } from 'react-router';

import { AppThemeProvider } from '../../../src/components/AppThemeProvider.tsx';
import { GuestHome, GuestMarketStatus } from '../../../src/components/guest-view/GuestView.tsx';
import { HelpPage } from '../../../src/components/help/HelpPage.tsx';
import { StaticLDProvider } from '../../../src/components/StaticLDProvider.tsx';
import { AppBar } from '../../../src/components/ui/app-bar/AppBar.tsx';
import { RootStoreProvider, useRootStore } from '../../../src/stores/react/store-context.tsx';
import type { RootStore } from '../../../src/stores/root.store.ts';

/**
 * The app's theme with its motion taken out. The guide moves between screens on its own timeline,
 * so a sheet that slid or a button that rippled on the phone's clock would land between frames.
 */
export const still = (theme: Theme) =>
	createTheme(theme, {
		transitions: {
			create: () => 'none',
			duration: {
				shortest: 0,
				shorter: 0,
				short: 0,
				standard: 0,
				complex: 0,
				enteringScreen: 0,
				leavingScreen: 0,
			},
		},
		components: { MuiButtonBase: { defaultProps: { disableRipple: true } } },
	});

/**
 * The guest app as `App` and its routes lay it out — the bar, then the home screen or the help
 * page — inside the same providers `main.tsx` mounts, but with the store handed in. The content
 * scrolls under the bar inside `.phone-scroll`, which the phone moves to keep what the narration
 * points at in view.
 */
export function PhoneApp({ store, route }: { store: RootStore; route: 'home' | 'help' }) {
	return (
		<AppThemeProvider>
			<ThemeProvider theme={still}>
				<StaticLDProvider>
					<RootStoreProvider store={store}>
						<MemoryRouter initialEntries={[route === 'help' ? '/help' : '/']}>
							<PhoneShell />
						</MemoryRouter>
					</RootStoreProvider>
				</StaticLDProvider>
			</ThemeProvider>
		</AppThemeProvider>
	);
}

const PhoneShell = observer(function PhoneShell() {
	const { translations } = useRootStore();

	return (
		<main className="app-shell" dir={translations.dir}>
			<AppBar />
			<div className="phone-scroll">
				<Routes>
					<Route
						path="/"
						element={
							<GuestHome>
								<GuestMarketStatus />
							</GuestHome>
						}
					/>
					<Route path="/help" element={<HelpPage />} />
				</Routes>
			</div>
		</main>
	);
});
