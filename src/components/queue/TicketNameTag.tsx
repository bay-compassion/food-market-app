import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useId } from 'react';

import { adminTranslations } from '../../adminLocales';
import { NameTag } from '../../models/name-tag';
import type { QueueGuest } from '../../services/admin-api';
import { NameTagCard } from './NameTagCard';
import { useQueueDesk } from './queue-desk-context';

const Print = styled.div`
	display: grid;
	gap: 4px;
	justify-items: center;
	margin-top: 8px;

	p {
		margin: 0;
		color: var(--color-text-subtle);
		font-size: 13px;
	}
`;

const PrintButton = styled.button`
	width: 100%;
	min-height: 44px;
	border: 1.5px solid var(--color-border);
	border-radius: var(--radius-pill);
	color: var(--color-text);
	background: var(--color-background);
	font-size: 15px;
	font-weight: 700;
`;

/**
 * The open ticket's name tag: shown to copy by hand, and printed at a tap on the print station.
 *
 * The label printer (a Dymo LabelWriter 450 Twin Turbo) connects to the station's computer over
 * USB, so the station is the only way to it — a phone's own print dialog can't reach it. While no
 * station is online the button is disabled and says why, rather than opening a dialog that offers
 * no label printer.
 */
export const TicketNameTag = observer(function TicketNameTag({ guest }: { guest: QueueGuest }) {
	const t = adminTranslations.en.queueDesk;
	const desk = useQueueDesk();
	const online = desk.printStationOnline;
	const statusId = useId();

	return (
		<div className="ticket-name-tag">
			<NameTagCard tag={new NameTag(guest)} />
			<Print>
				<PrintButton
					type="button"
					className="print-name-tag"
					aria-describedby={statusId}
					disabled={!online || desk.isSendingNameTag(guest)}
					onClick={() => void desk.sendNameTag(guest)}
				>
					{t.printNameTag}
				</PrintButton>
				<p id={statusId}>{online ? t.printsAtStation : t.printStationIsOffline}</p>
			</Print>
		</div>
	);
});
