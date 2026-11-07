import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { useRootStore } from '../../stores/react/store-context';
import { ChecklistAddress } from './ChecklistAddress';
import { ChecklistStep } from './ChecklistStep';
import { ChecklistSteps } from './ChecklistSteps';

const Hint = styled.p`
	color: var(--color-text-subtle);
	font-size: 14px;
`;

/**
 * Putting the `/kiosk` board up in the auditorium. The unlock code comes from the same dialog the
 * queue screen's menu opens, which the dashboard already mounts; a worker who can't run the queue
 * can't ask for one, so they are told who can instead.
 */
export const RoomDisplayStep = observer(function RoomDisplayStep({ number }: { number: number }) {
	const t = adminTranslations.en.checklist.roomDisplay;
	const { admin } = useRootStore();

	return (
		<ChecklistStep number={number} title={t.title} place={t.place}>
			<ChecklistSteps steps={t.steps} />
			<ChecklistAddress label={t.addressLabel} path="/kiosk" />
			{admin.can('run:queue') ? (
				<Button variant="outlined" onClick={() => void admin.showKioskUnlockCode()}>
					{t.getCode}
				</Button>
			) : (
				<Hint>{t.askForCode}</Hint>
			)}
		</ChecklistStep>
	);
});
