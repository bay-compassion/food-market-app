import styled from '@emotion/styled';

import { adminTranslations } from '../../adminLocales';
import { NameTag } from '../../models/name-tag';
import type { QueueGuest } from '../../services/admin-api';
import { NameTagCard } from './NameTagCard';
import { NameTagPrint } from './NameTagPrint';

const PrintButton = styled.button`
	width: 100%;
	min-height: 44px;
	margin-top: 8px;
	border: 1.5px solid var(--color-border);
	border-radius: var(--radius-pill);
	color: var(--color-text);
	background: var(--color-background);
	font-size: 15px;
	font-weight: 700;
`;

/**
 * The open ticket's name tag: shown to copy by hand, and printed on the label printer at a tap.
 * The phone's own print dialog does the printing — AirPrint on an iPhone, Mopria on Android — so a
 * volunteer's own phone needs no app or pairing, only the printer chosen once in that dialog.
 */
export function TicketNameTag({ guest }: { guest: QueueGuest }) {
	const t = adminTranslations.en.queueDesk;
	const tag = new NameTag(guest);

	return (
		<div className="ticket-name-tag">
			<NameTagCard tag={tag} />
			<PrintButton type="button" className="print-name-tag" onClick={() => window.print()}>
				{t.printNameTag}
			</PrintButton>
			<NameTagPrint tag={tag} />
		</div>
	);
}
