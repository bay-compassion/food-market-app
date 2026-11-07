import styled from '@emotion/styled';

import { useFullscreen } from '../hooks/use-fullscreen';
import { FullscreenGlyph } from './FullscreenGlyph';
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
