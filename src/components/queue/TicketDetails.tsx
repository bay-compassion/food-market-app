import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { languages } from '../../locales';
import type { QueueGuest } from '../../services/admin-api';
import { adminVisitStatusLabels } from '../../services/visitStatusLabels';
import { TicketActions } from './TicketActions';
import { TicketGuestDetails } from './TicketGuestDetails';
import { TicketHistory } from './TicketHistory';
import { TicketNameTag } from './TicketNameTag';
import { TicketSummary } from './TicketSummary';

const Details = styled.div`
	display: grid;
	gap: 14px;

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
 * Everything on an open ticket: its number and clock, the name tag to write out, what to do next,
 * and what has happened so far. The phone's sheet and the desk's pane both show it.
 */
export const TicketDetails = observer(function TicketDetails({ guest }: { guest: QueueGuest }) {
	const t = adminTranslations.en.queueDesk;
	const statusLabels = adminVisitStatusLabels('en');
	const language = languages.find(({ code }) => code === guest.locale)?.englishLabel;

	return (
		<Details>
			<TicketSummary guest={guest} statusLabel={statusLabels[guest.status]} />
			<TicketNameTag guest={guest} />
			<p className="guest-details">
				<span>{t.household.replace('{count}', String(guest.householdSize))}</span>
				{language ? <span>{language}</span> : null}
			</p>
			<TicketActions guest={guest} />
			{/* Keyed by guest, so opening another ticket starts its form afresh. */}
			<TicketGuestDetails key={guest.guestId} guest={guest} />
			<TicketHistory />
		</Details>
	);
});
