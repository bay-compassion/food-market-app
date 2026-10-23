import styled from '@emotion/styled';

import { Bilingual, type KioskText } from './kiosk-languages';
import { KioskHeader } from './KioskHeader';
import { LanguageIndicator } from './LanguageIndicator';

/**
 * The room display's full-screen backdrop. Every size is in viewport units: the screen is read from
 * across a room, so text scales with the display rather than sitting at a phone's pixel sizes.
 */
export const KioskFrame = styled.main`
	display: flex;
	flex-direction: column;
	/* A fixed height, not a minimum: content that doesn't fit must give way, never push the
	   footer off the bottom of a screen nobody can scroll. */
	height: 100dvh;
	padding: 3vmin 3vmin;
	background: var(--color-brand-dark);
	color: var(--color-on-brand);
	font-family: var(--font-heading);
	overflow: hidden;
	/* Keep the pointer visible while browsing; only the fullscreen room display hides it. */
	@media (display-mode: fullscreen) {
		cursor: none;
	}
`;

/** The centred column a one-sentence screen fills; the locked screen sets its form in it too. */
export const KioskMessageLayout = styled.section`
	display: flex;
	flex: 1;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 5vmin;
	text-align: center;

	p {
		max-width: 28ch;
		/* Explicit, so a right-to-left second line stays centred under the English. */
		text-align: center;
		margin: 0;
		font-size: clamp(2rem, 7vmin, 6rem);
		font-weight: 600;
		line-height: 1.2;
	}
`;

export type KioskMessageProps = {
	message: KioskText;
};

/**
 * One sentence filling the display, in English with the rotating language under it, for every
 * state that is not a queue being called.
 */
export function KioskMessage({ message }: KioskMessageProps) {
	return (
		<>
			{/* Outside the live region, so the clock's minutes are never announced. */}
			<KioskHeader />
			<KioskMessageLayout role="status" aria-live="polite">
				<p>
					<Bilingual text={message} />
				</p>
			</KioskMessageLayout>
			{/* The message fills the frame, so this sits along the bottom edge, as on the board. */}
			<LanguageIndicator />
		</>
	);
}
