import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { useRootStore } from '../../stores/react/store-context';
import { ChecklistAddress } from './ChecklistAddress';
import { ChecklistPhase } from './ChecklistPhase';
import { ChecklistTaskList } from './ChecklistTaskList';

const Wait = styled.p`
	margin: 0;
	padding: 10px 12px;
	border-radius: var(--radius-sm);
	color: var(--color-warning);
	background: var(--color-warning-surface);
	font-size: 14px;
	line-height: 1.45;
`;

/**
 * The check-in operator's own window, opened once the printing station is running. Until the
 * station says it is online, a note says to wait: starting the station quits Chrome, and with it
 * a queue desk opened too soon. A worker who can't see the station's status gets no note, since
 * there is nothing for them to wait on.
 */
export const QueueDeskPhase = observer(function QueueDeskPhase() {
	const t = adminTranslations.en.checklist.checkIn;
	const { admin } = useRootStore();

	return (
		<ChecklistPhase letter="C" title={t.queueDeskTitle}>
			{admin.printStationOnline === false ? <Wait>{t.queueDeskWait}</Wait> : null}
			<ChecklistTaskList
				steps={t.queueDeskSteps}
				extras={{
					'queue-sign-in': (
						<>
							<ChecklistAddress label={t.queueDeskAddressLabel} path="/queue" />
							<Button variant="contained" href="/queue" target="_blank" rel="noopener">
								{t.openQueueDesk}
							</Button>
						</>
					),
				}}
			/>
		</ChecklistPhase>
	);
});
