import { outlinedInputClasses } from '@mui/material/OutlinedInput';
import { createTheme } from '@mui/material/styles';

/**
 * The keyboard focus ring `base.css` puts on every bare control, reapplied to the MUI wrapper.
 *
 * MUI nests the real `input` inside a wrapper that draws the border, so the ring `base.css` gives
 * the input itself would land inside that border — or, for a checkbox, on the transparent input
 * covering the icon, where it cannot be seen at all. Matching `:has(:focus-visible)` on the wrapper
 * puts it back where it was: outside the control, and only for keyboard focus.
 */
const focusRing = {
	outline: '3px solid var(--color-focus)',
	outlineOffset: '2px',
} as const;

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
		MuiAlert: {
			defaultProps: {
				variant: 'outlined',
			},
		},
		MuiButton: {
			defaultProps: {
				variant: 'contained',
			},
		},
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
		MuiCheckbox: {
			styleOverrides: {
				root: {
					marginTop: 2,
					padding: 0,
					color: 'var(--color-border)',
					'&:has(:focus-visible)': focusRing,
					'& .MuiSvgIcon-root': { fontSize: 22 },
				},
			},
		},
		MuiFormControlLabel: {
			styleOverrides: {
				root: {
					gap: 10,
					// The consent copy runs to several lines, so the box sits against the first of them
					// rather than the middle of the block.
					alignItems: 'flex-start',
					margin: 0,
				},
				label: {
					fontWeight: 400,
					lineHeight: 1.55,
				},
			},
		},
		// The field label sits above its control rather than floating in the border, which is why
		// this is a `FormLabel` and not an `InputLabel`.
		MuiFormLabel: {
			styleOverrides: {
				root: {
					marginBottom: 8,
					color: 'var(--color-text)',
					fontFamily: 'var(--font-heading)',
					fontSize: 16,
					fontWeight: 700,
					lineHeight: 1.2,
					'&.Mui-focused': { color: 'var(--color-text)' },
				},
			},
		},
		MuiOutlinedInput: {
			styleOverrides: {
				root: {
					color: 'var(--color-text)',
					backgroundColor: 'var(--color-background)',
					borderRadius: 'var(--radius-md)',
					fontFamily: 'var(--font-body)',
					fontSize: 16,
					fontWeight: 400,
					'&:has(:focus-visible)': focusRing,
					// The outline keeps one weight and color throughout: focus is signalled by the ring
					// above, so MUI's hover and focus border colors would only compete with it.
					[`&:hover .${outlinedInputClasses.notchedOutline},
						&.Mui-focused .${outlinedInputClasses.notchedOutline}`]: {
						borderWidth: 2,
						borderColor: 'var(--color-border)',
					},
					'&.MuiInputBase-multiline': { padding: '14px 16px' },
				},
				notchedOutline: {
					// The label sits above the control, never inside its border, so the notch MUI cuts
					// for a floating one is closed up and the outline goes back to hugging the field.
					// Left as MUI has it, the border box stands 5px taller than the 58px the design
					// system specifies, and it eats the gap under the label to do it.
					top: 0,
					'& legend': { display: 'none' },
					borderWidth: 2,
					borderColor: 'var(--color-border)',
				},
				input: {
					height: 58,
					boxSizing: 'border-box',
					padding: '0 16px',
					// The wrapper draws the ring for the whole control, so the inner element skips its own.
					'&:focus-visible': { outline: 0 },
					'&::placeholder': { color: 'var(--color-placeholder)', opacity: 1 },
					'&.MuiInputBase-inputMultiline': { height: 'auto', padding: 0 },
				},
			},
		},
		MuiSelect: {
			styleOverrides: {
				select: {
					// Room for MUI's own dropdown chevron, which replaces the native one.
					'&.MuiInputBase-input': { paddingInlineEnd: 40 },
				},
			},
		},
	},
});
