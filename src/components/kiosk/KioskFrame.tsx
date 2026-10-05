import styled from '@emotion/styled';

import { Bilingual, type KioskText } from './kiosk-languages';
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
	padding: 4vmin 5vmin;
	background: var(--color-brand-dark);
	color: var(--color-on-brand);
	font-family: var(--font-heading);
	overflow: hidden;
	cursor: none;
`;

const Message = styled.section`
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

	button {
		padding: 2vmin 5vmin;
		border: 0;
		border-radius: var(--radius-pill);
		background: var(--color-on-brand);
		color: var(--color-brand-dark);
		font-size: clamp(1.25rem, 3.5vmin, 2.5rem);
		font-weight: 700;
		cursor: pointer;
	}
`;

export type KioskMessageProps = {
	message: KioskText;
	/** A button under the message, for the one state a worker has to act on. */
	action?: { label: KioskText; onClick: () => void };
};

/**
 * One sentence filling the display, in English with the rotating language under it, for every
 * state that is not a queue being called.
 */
export function KioskMessage({ message, action }: KioskMessageProps) {
	return (
		<>
			<Message role="status" aria-live="polite">
				<p>
					<Bilingual text={message} />
				</p>
				{action ? (
					<button type="button" onClick={action.onClick}>
						<Bilingual text={action.label} />
					</button>
				) : null}
			</Message>
			{/* The message fills the frame, so this sits along the bottom edge, as on the board. */}
			<LanguageIndicator />
		</>
	);
}
