import { ThemeProvider, useColorScheme } from '@mui/material/styles';
import { type PropsWithChildren, useEffect } from 'react';

import { appTheme } from '../theme';

/** Where the guest's choice is kept. `public/color-mode.js` reads the same key before first paint. */
const colorModeStorageKey = 'color-mode';

/** The browser chrome's colour in each scheme: the app bar's, `--color-brand-surface`. */
const themeColors = { light: '#275c63', dark: '#1e474d' } as const;

interface AppThemeProviderProps {
	/**
	 * Left out, the scheme is the guest's choice from the menu, remembered on the device, and
	 * otherwise the device's own setting. `light` pins the page light whatever either says — the
	 * guides' phone frames and Storybook pass it, alongside a static `data-theme="light"` on
	 * `<html>` so `base.css` is light before this mounts. `dark` and `system` remember nothing
	 * either; Storybook's colour-scheme toolbar uses them to preview dark mode.
	 */
	mode?: 'light' | 'dark' | 'system';
}

/**
 * The app's theme. It writes `data-theme` on `<html>`, which both MUI's colour variables and the
 * tokens in `base.css` read.
 */
export function AppThemeProvider({ mode, children }: PropsWithChildren<AppThemeProviderProps>) {
	return (
		<ThemeProvider
			theme={appTheme}
			defaultMode={mode ?? 'system'}
			modeStorageKey={colorModeStorageKey}
			// `undefined` is MUI's own `localStorage` manager; `null` stores nothing.
			storageManager={mode ? null : undefined}
			noSsr
		>
			<ThemeColor />
			{children}
		</ThemeProvider>
	);
}

/** Keeps the browser chrome (`<meta name="theme-color">`) matching the scheme on screen. */
function ThemeColor() {
	const { colorScheme } = useColorScheme();

	useEffect(() => {
		const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

		if (meta && colorScheme) {
			meta.content = themeColors[colorScheme];
		}
	}, [colorScheme]);

	return null;
}
