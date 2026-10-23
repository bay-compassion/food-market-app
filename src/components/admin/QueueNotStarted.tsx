import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { useRootStore } from '../../stores/react/store-context';

const Empty = styled.section`
	display: grid;
	gap: 14px;
	justify-items: start;

	p {
		color: var(--color-text-subtle);
		line-height: 1.5;
	}
`;

/** The dashboard's queue tab before service: the way to the session, and to setting up a display. */
export const QueueNotStarted = observer(function QueueNotStarted({
	onNavigateCurrentSession,
}: {
	onNavigateCurrentSession: () => void;
}) {
	const t = adminTranslations.en;
	const { admin } = useRootStore();

	return (
		<Empty className="admin-section queue-empty">
			<h2>{t.queue}</h2>
			<p>{t.queueNotStarted}</p>
			<Button type="button" variant="outlined" onClick={onNavigateCurrentSession}>
				{t.goToCurrentSession}
			</Button>
			{/* A display unlocked before service shows "not started" and switches over by itself. */}
			<Button type="button" onClick={() => void admin.showKioskUnlockCode()}>
				{t.kioskUnlock.open}
			</Button>
		</Empty>
	);
});
