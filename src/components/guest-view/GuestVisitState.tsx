import { observer } from 'mobx-react-lite';

import { CancelVisitAction } from './CancelVisitAction';
import { GuestStatusCard } from './GuestStatusCard';
import { GuestVisitStatus } from './GuestVisitStatus';
import { HomeScreenOffer } from './home-screen/HomeScreenOffer';
import { VisitRefreshNotice } from './visit-status/VisitRefreshNotice';

/** Current-visit card, plus the standalone cancel action kept outside it. */
export const GuestVisitState = observer(function GuestVisitState() {
	return (
		<>
			<GuestStatusCard>
				<GuestVisitStatus />
			</GuestStatusCard>
			{/*
				Outside the card on purpose: the card is an `aria-live` region, and a per-second
				countdown inside one would fight with the status announcements it exists to deliver.
			*/}
			<VisitRefreshNotice />
			<HomeScreenOffer />
			<CancelVisitAction />
		</>
	);
});
