import { ThemeProvider } from '@mui/material/styles';
import type { PropsWithChildren } from 'react';

import { adminTheme } from '../../theme';

/**
 * The dashboard's theme for everything under it, dialogs and menus included: they render in a
 * portal, but read the theme from the React tree they were opened from.
 */
export function AdminThemeProvider({ children }: PropsWithChildren) {
	return <ThemeProvider theme={adminTheme}>{children}</ThemeProvider>;
}
