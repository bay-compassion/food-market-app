import styled from '@emotion/styled';
import { SwipeableDrawer } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { useQueueDesk } from './queue-desk-context';
import { TicketDetails } from './TicketDetails';

// The sheet renders in a portal, outside the queue screen's frame, so it carries its own styles.
const Sheet = styled(SwipeableDrawer)`
	.MuiBackdrop-root {
		background: var(--color-scrim);
	}

	.MuiDrawer-paper {
		box-sizing: border-box;
		display: grid;
		gap: 14px;
		width: min(100%, 480px);
		max-height: calc(100dvh - 32px);
		margin-inline: auto;
		padding: 10px 16px calc(18px + env(safe-area-inset-bottom));
		overflow-y: auto;
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
		color: var(--color-text);
		background: var(--color-background);
		font-family: var(--font-body);
	}

	.handle {
		justify-self: center;
		width: 40px;
		height: 5px;
		padding: 0;
		border: 0;
		border-radius: var(--radius-pill);
		background: var(--color-border);
	}
`;

/**
 * The open ticket on a phone, risen from the bottom edge. Opening one is how a volunteer works
 * with a guest; the list behind it stays one line per ticket.
 */
export const TicketSheet = observer(function TicketSheet() {
	const t = adminTranslations.en.queueDesk;
	const desk = useQueueDesk();
	const guest = desk.selected;

	return (
		<Sheet
			anchor="bottom"
			className="ticket-sheet"
			open={guest !== null}
			// The content comes from the store, so an outgoing transition would animate an empty panel.
			transitionDuration={0}
			onClose={() => desk.dismiss()}
			// Dragging the sheet down dismisses it; it only ever opens by choosing a ticket.
			disableSwipeToOpen
			onOpen={() => undefined}
			slotProps={{
				paper: { dir: 'ltr', lang: 'en', 'aria-label': t.ticket },
			}}
		>
			{guest ? (
				<>
					<button
						type="button"
						className="handle"
						aria-label={t.closeTicket}
						onClick={() => desk.dismiss()}
					/>
					<TicketDetails guest={guest} />
				</>
			) : null}
		</Sheet>
	);
});
