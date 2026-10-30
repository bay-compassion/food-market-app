import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { SaturdayProgress } from '../../models/saturday-progress';
import { useRootStore } from '../../stores/react/store-context';
import { CancelVisitAction } from './CancelVisitAction';
import { GuestSaturdayTimeline } from './GuestSaturdayTimeline';
import { GuestVisitStatus } from './GuestVisitStatus';
import { HomeScreenOffer } from './home-screen/HomeScreenOffer';
import { VisitRefreshNotice } from './visit-status/VisitRefreshNotice';

const State = styled.div`
	display: grid;
	gap: 24px;
`;

/** Current-visit card, then today's progress and the standalone cancel action, kept outside it. */
export const GuestVisitState = observer(function GuestVisitState() {
	const { visit } = useRootStore();
	const status = visit.currentVisit?.status;
	const progress = status ? SaturdayProgress.forVisit(status) : null;

	return (
		<State>
			<GuestVisitStatus />
			{/*
				Outside the card on purpose: the card is an `aria-live` region, and a per-second
				countdown inside one would fight with the status announcements it exists to deliver —
				as would the timeline re-read whenever the card changed.
			*/}
			<VisitRefreshNotice />
			<HomeScreenOffer />
			{progress ? <GuestSaturdayTimeline progress={progress} /> : null}
			<CancelVisitAction />
		</State>
	);
});
