import { ThemeProvider } from '@mui/material/styles';
import type { PropsWithChildren } from 'react';

import { appTheme } from '../theme';

interface AppThemeProviderProps {
	/**
	 * `light` pins the page to the light scheme whatever the device prefers — the guides' phone
	 * frames and Storybook pass it, alongside a static `data-theme="light"` on `<html>` so
	 * `base.css` is light before this mounts. Left out, the scheme follows the device.
	 */
	mode?: 'light' | 'system';
}

/**
 * The app's theme. It writes `data-theme` on `<html>`, which both MUI's colour variables and the
 * tokens in `base.css` read. Nothing is stored: there is no in-app switch yet, so a remembered mode
 * could only ever disagree with the device.
 */
export function AppThemeProvider({
	mode = 'system',
	children,
}: PropsWithChildren<AppThemeProviderProps>) {
	return (
		<ThemeProvider theme={appTheme} defaultMode={mode} storageManager={null} noSsr>
			{children}
		</ThemeProvider>
	);
}
