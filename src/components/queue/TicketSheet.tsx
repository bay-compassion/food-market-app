import styled from '@emotion/styled';
import { Drawer } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useRef, type KeyboardEvent } from 'react';

import { adminTranslations } from '../../adminLocales';
import { useSwipeToDismiss } from '../hooks/use-swipe-to-dismiss';
import { callBarOffset } from './call-bar';
import { useQueueDesk } from './queue-desk-context';
import { TicketDetails } from './TicketDetails';

// Docked, the sheet renders where it is placed, but it is fixed to the viewport, so it carries its
// own type and colours rather than inherit the frame's.
const Sheet = styled(Drawer)`
	.MuiDrawer-paper {
		box-sizing: border-box;
		display: grid;
		gap: 14px;
		width: min(100%, 480px);
		/* Some of the line stays in view above it, to tap another ticket straight from the list. */
		max-height: calc(75dvh - ${callBarOffset});
		bottom: ${callBarOffset};
		margin-inline: auto;
		padding: 0 16px 18px;
		overflow-y: auto;
		overscroll-behavior: contain;
		border: 0;
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
		color: var(--color-text);
		background: var(--color-background);
		box-shadow: 0 -8px 24px rgb(30 71 77 / 18%);
		font-family: var(--font-body);
	}

	/* The strip a finger drags the sheet down by. It stays put while the ticket scrolls under it. */
	.grip {
		position: sticky;
		top: 0;
		z-index: 1;
		display: grid;
		place-items: center;
		margin-inline: -16px;
		padding: 10px 0 6px;
		background: var(--color-background);
		touch-action: none;
	}

	.handle {
		width: 40px;
		height: 5px;
		padding: 0;
		border: 0;
		border-radius: var(--radius-pill);
		background: var(--color-border);
	}

	/* Taller than it looks, so it is an easy target. */
	.handle::before {
		content: '';
		position: absolute;
		inset: 0;
	}
`;

/**
 * The open ticket on a phone, risen from the bottom edge to sit on the call bar. Opening one is
 * how a volunteer works with a guest; the list behind it stays one line per ticket.
 *
 * It does not block the screen: the call button below it and the tickets above it still answer
 * the first tap — calling the next guest, or opening another ticket in this one's place. It closes
 * from its handle, by dragging it down, or with Escape.
 */
export const TicketSheet = observer(function TicketSheet() {
	const t = adminTranslations.en.queueDesk;
	const desk = useQueueDesk();
	const guest = desk.selected;
	const paper = useRef<HTMLDivElement>(null);
	const swipe = useSwipeToDismiss(paper, () => desk.dismiss());

	return (
		<Sheet
			anchor="bottom"
			variant="persistent"
			className="ticket-sheet"
			open={guest !== null}
			// The content comes from the store, so an outgoing transition would animate an empty panel.
			transitionDuration={0}
			slotProps={{
				paper: {
					ref: paper,
					component: 'section',
					dir: 'ltr',
					lang: 'en',
					'aria-label': t.ticket,
					onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
						if (event.key === 'Escape') {
							desk.dismiss();
						}
					},
				},
			}}
		>
			{guest ? (
				<>
					<div className="grip" {...swipe}>
						<button
							type="button"
							className="handle"
							aria-label={t.closeTicket}
							onClick={() => desk.dismiss()}
						/>
					</div>
					<TicketDetails guest={guest} />
				</>
			) : null}
		</Sheet>
	);
});
