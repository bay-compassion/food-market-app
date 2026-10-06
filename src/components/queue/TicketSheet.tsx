import styled from '@emotion/styled';
import { Drawer } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { languages } from '../../locales';
import { adminVisitStatusLabels } from '../../services/visitStatusLabels';
import { useQueueDesk } from './queue-desk-context';
import { TicketActions } from './TicketActions';
import { TicketHistory } from './TicketHistory';
import { TicketNameTag } from './TicketNameTag';
import { TicketSummary } from './TicketSummary';

// The sheet renders in a portal, outside the queue screen's frame, so it carries its own styles.
const Sheet = styled(Drawer)`
	.MuiBackdrop-root {
		background: rgb(1 42 47 / 62%);
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

	.guest-details {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 16px;
		margin: 0;
		color: var(--color-text-muted);
		font-size: 15px;
	}
`;

/**
 * The open ticket, risen from the bottom edge: its number and clock, the name tag to write out,
 * what to do next, and what has happened so far. Opening one is how a volunteer works with a
 * guest; the list behind it stays one line per ticket.
 */
export const TicketSheet = observer(function TicketSheet() {
	const t = adminTranslations.en.queueDesk;
	const desk = useQueueDesk();
	const guest = desk.selected;
	const statusLabels = adminVisitStatusLabels('en');
	const language = languages.find(({ code }) => code === guest?.locale)?.englishLabel;

	return (
		<Sheet
			anchor="bottom"
			className="ticket-sheet"
			open={guest !== null}
			// The content comes from the store, so an outgoing transition would animate an empty panel.
			transitionDuration={0}
			onClose={() => desk.dismiss()}
			slotProps={{ paper: { dir: 'ltr', lang: 'en', 'aria-label': t.ticket } }}
		>
			{guest ? (
				<>
					<button
						type="button"
						className="handle"
						aria-label={t.closeTicket}
						onClick={() => desk.dismiss()}
					/>
					<TicketSummary guest={guest} statusLabel={statusLabels[guest.status]} />
					<TicketNameTag guest={guest} />
					<p className="guest-details">
						<span>{t.household.replace('{count}', String(guest.householdSize))}</span>
						{language ? <span>{language}</span> : null}
					</p>
					<TicketActions guest={guest} />
					<TicketHistory />
				</>
			) : null}
		</Sheet>
	);
});
