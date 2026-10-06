import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { NameTag } from '../../models/name-tag';
import type { QueueGuest } from '../../services/admin-api';
import { NameTagCard } from './NameTagCard';
import { NameTagPrint } from './NameTagPrint';
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
 * The open ticket's name tag: shown to copy by hand, and printed on the label printer at a tap.
 *
 * With a print station online the tag goes there and prints with no dialog. Without one, the
 * phone's own print dialog does it — AirPrint on an iPhone, Mopria on Android — so a volunteer's
 * own phone needs no app or pairing either way. The choice is made in the tap from the last known
 * state, because a phone only opens a print dialog as the direct result of a tap.
 */
export const TicketNameTag = observer(function TicketNameTag({ guest }: { guest: QueueGuest }) {
	const t = adminTranslations.en.queueDesk;
	const desk = useQueueDesk();
	const tag = new NameTag(guest);
	const viaStation = desk.printStationOnline;

	function print() {
		if (viaStation) {
			void desk.sendNameTag(guest);
		} else {
			window.print();
		}
	}

	return (
		<div className="ticket-name-tag">
			<NameTagCard tag={tag} />
			<Print>
				<PrintButton
					type="button"
					className="print-name-tag"
					disabled={desk.isSendingNameTag(guest)}
					onClick={print}
				>
					{t.printNameTag}
				</PrintButton>
				<p>{viaStation ? t.printsAtStation : t.printsFromPhone}</p>
			</Print>
			<NameTagPrint tag={tag} />
		</div>
	);
});
