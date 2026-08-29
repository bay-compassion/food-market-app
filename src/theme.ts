import { createTheme } from '@mui/material/styles';

/**
 * The MUI counterpart to the design tokens in `styles/base.css`.
 *
 * Keep these values aligned while components are migrated incrementally. MUI needs concrete color
 * values here because it derives contrast and tonal colors when the theme is created.
 */
export const appTheme = createTheme({
	palette: {
		primary: {
			main: '#023940',
			dark: '#012a2f',
			contrastText: '#fff',
		},
		background: {
			default: '#fff',
			paper: '#fff',
		},
		text: {
			primary: '#101010',
			secondary: '#3d453f',
		},
		error: { main: '#a12622' },
		success: { main: '#146c34' },
		warning: { main: '#7a4e00' },
	},
	shape: {
		borderRadius: 24,
	},
	typography: {
		fontFamily: 'Roboto, Arial, sans-serif',
		h1: {
			fontFamily: "'Roboto Condensed', Impact, sans-serif",
			fontSize: '2.375rem',
			fontWeight: 700,
			lineHeight: 1.05,
			letterSpacing: '-0.01em',
			textTransform: 'uppercase',
		},
	},
	components: {
		MuiCard: {
			defaultProps: {
				variant: 'outlined',
			},
			styleOverrides: {
				root: {
					borderWidth: 2,
					borderColor: 'var(--color-brand)',
				},
			},
		},
	},
});
