import { Card, CardContent } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';
import { GuestVisitStatus } from './GuestVisitStatus';

/** Current-visit card and the side effect used to cancel that visit. */
export const GuestVisitState = observer(function GuestVisitState() {
	const t = useTranslation();
	const { visit } = useRootStore();

	function cancelVisit() {
		if (window.confirm(t.guestView.visitStatus.cancelConfirmation)) {
			void visit.cancel();
		}
	}

	return (
		<Card aria-live="polite">
			<CardContent>
				<GuestVisitStatus onCancelVisit={cancelVisit} />
			</CardContent>
		</Card>
	);
});
