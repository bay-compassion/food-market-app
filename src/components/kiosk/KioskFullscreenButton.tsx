import styled from '@emotion/styled';

import { useFullscreen } from '../hooks/use-fullscreen';
import { useKioskLanguages } from './kiosk-languages';

/* Out of the board's layout, in the corner, and quiet: it is for whoever sets the display up, not
   for the room. */
const Button = styled.button`
	position: fixed;
	right: 2vmin;
	bottom: 2vmin;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 0.5em;
	border: 1px solid currentColor;
	border-radius: var(--radius-pill);
	background: transparent;
	color: inherit;
	font-size: clamp(1rem, 2.5vmin, 1.5rem);
	opacity: 0.7;
	cursor: pointer;

	&:hover,
	&:focus-visible {
		opacity: 1;
	}
`;

/** Material's `Fullscreen` glyph, inlined rather than pulling in `@mui/icons-material`. */
function FullscreenGlyph() {
	return (
		<svg viewBox="0 0 24 24" width="1.25em" height="1.25em" aria-hidden="true" focusable="false">
			<path
				fill="currentColor"
				d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"
			/>
		</svg>
	);
}

/**
 * Takes the room display full screen. It goes away once the display is, since nobody in the room
 * should see it; Escape brings the browser back, and the button with it.
 *
 * Just the glyph, with its name in English for assistive tech: a setup control, not a line for the
 * room.
 */
export function KioskFullscreenButton() {
	const { primary } = useKioskLanguages();
	const { supported, active, enter } = useFullscreen();

	if (!supported || active) {
		return null;
	}

	return (
		<Button type="button" aria-label={primary.copy.fullscreen} onClick={enter}>
			<FullscreenGlyph />
		</Button>
	);
}
