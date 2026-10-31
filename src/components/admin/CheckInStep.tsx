import styled from '@emotion/styled';
import { Button } from '@mui/material';

import { adminTranslations } from '../../adminLocales';
import { ChecklistAddress } from './ChecklistAddress';
import { ChecklistStep } from './ChecklistStep';
import { PrintStationCard } from './PrintStationCard';

const QueueDesk = styled.section`
	display: grid;
	gap: 12px;

	h3 {
		margin: 0;
		font-size: 18px;
	}

	p {
		margin: 0;
		color: var(--color-text-subtle);
	}
`;

/**
 * The computer at the entrance does two jobs. Its Chrome, started with the printing station's
 * launch command, prints the name tags; the check-in operator then runs the line from the desktop
 * queue desk in an ordinary window beside it. The station comes first because its setup quits
 * Chrome, which would close a queue desk already open. The two windows need different sign-ins:
 * the station's account can print but not change the queue.
 */
export function CheckInStep({ number }: { number: number }) {
	const t = adminTranslations.en.checklist.checkIn;

	return (
		<ChecklistStep number={number} title={t.title} place={t.place}>
			<PrintStationCard />
			<QueueDesk>
				<h3>{t.queueDeskTitle}</h3>
				<p>{t.queueDesk}</p>
				<ChecklistAddress label={t.queueDeskAddressLabel} path="/queue" />
				<Button variant="outlined" href="/queue" target="_blank" rel="noopener">
					{t.openQueueDesk}
				</Button>
			</QueueDesk>
		</ChecklistStep>
	);
}
