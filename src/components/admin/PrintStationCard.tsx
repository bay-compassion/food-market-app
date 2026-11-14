import styled from '@emotion/styled';

import { adminTranslations } from '../../adminLocales';
import { ChecklistPhase } from './ChecklistPhase';
import { ChecklistTaskList } from './ChecklistTaskList';
import { PrintStationStatus } from './PrintStationStatus';
import { PrintTestTagButton } from './PrintTestTagButton';
import { usePrintStationCheck } from './use-print-station-check';

const Account = styled.p`
	margin: 0;
	padding: 10px 12px;
	border-radius: var(--radius-sm);
	color: var(--color-text-muted);
	background: var(--color-surface-soft);
	font-size: 14px;
	line-height: 1.45;
`;

/**
 * The check-in iMac's printing station, as a phase of the Check-In station: whether it is checking
 * in right now, which account signs in, the market-day steps, and a test tag to check the printer
 * once the station is online. Its last step is ticked by the station's own check-in. Compassion
 * Food Market runs the station beside the queue desk; starting it in Chrome instead, from
 * Terminal, is under When You Need It.
 */
export function PrintStationCard() {
	const t = adminTranslations.en.printStationCard;

	usePrintStationCheck();

	return (
		<ChecklistPhase letter="B" title={t.title} aside={<PrintStationStatus />}>
			<Account>{t.account}</Account>
			<ChecklistTaskList steps={t.steps} />
			<PrintTestTagButton />
		</ChecklistPhase>
	);
}
