import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { currentSessionState, type CurrentSessionState } from '../../services/sessionStateMachine';
import { useRootStore } from '../../stores/react/store-context';

/** Solid rather than tinted: it is the thing a worker opens the dashboard to check. */
const stateColors: Record<CurrentSessionState, string> = {
	scheduled: '#254d7a',
	registration_open: '#146c34',
	registration_closed: '#7a4e00',
	lottery_pending: '#7a4e00',
	service_started: '#39306b',
	inactive: '#7a4e00',
};

const Chip = styled.span<{ $state: CurrentSessionState }>`
	display: inline-flex;
	flex-shrink: 0;
	gap: 8px;
	align-items: center;
	padding: 6px 12px;
	border-radius: var(--radius-pill);
	background: ${({ $state }) => stateColors[$state]};
	color: white;
	font-size: 13px;
	font-weight: 700;
	line-height: 1.2;
	white-space: nowrap;

	/* The status light, which carries the state at a glance before the words are read. */
	&::before {
		content: '';
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: currentColor;
	}
`;

/** Where today's session stands, shown beside every admin screen's title. */
export const SessionStateChip = observer(function SessionStateChip() {
	const { translations, session } = useRootStore();
	const t = translations.adminTranslation;
	const state = currentSessionState(session.currentState?.event?.status);
	const labels: Record<CurrentSessionState, string> = {
		scheduled: t.scheduled,
		registration_open: t.open,
		registration_closed: t.closed,
		lottery_pending: t.lotteryPending,
		service_started: t.serviceStarted,
		inactive: t.noActiveSession,
	};

	return (
		<Chip className="session-state" $state={state}>
			{labels[state]}
		</Chip>
	);
});
