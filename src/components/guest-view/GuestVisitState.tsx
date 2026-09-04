import { Card, CardContent } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { CancelVisitAction } from './CancelVisitAction';
import { GuestVisitStatus } from './GuestVisitStatus';

/** Current-visit card, plus the standalone cancel action kept outside it. */
export const GuestVisitState = observer(function GuestVisitState() {
	return (
		<>
			<Card aria-live="polite">
				<CardContent>
					<GuestVisitStatus />
				</CardContent>
			</Card>
			<CancelVisitAction />
		</>
	);
});
