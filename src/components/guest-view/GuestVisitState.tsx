import { Card, CardContent } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { CancelVisitAction } from './CancelVisitAction';
import { GuestVisitStatus } from './GuestVisitStatus';
import { VisitRefreshNotice } from './visit-status/VisitRefreshNotice';

/** Current-visit card, plus the standalone cancel action kept outside it. */
export const GuestVisitState = observer(function GuestVisitState() {
	return (
		<>
			<Card aria-live="polite">
				<CardContent>
					<GuestVisitStatus />
				</CardContent>
			</Card>
			{/*
				Outside the card on purpose: the card is an `aria-live` region, and a per-second
				countdown inside one would fight with the status announcements it exists to deliver.
			*/}
			<VisitRefreshNotice />
			<CancelVisitAction />
		</>
	);
});
