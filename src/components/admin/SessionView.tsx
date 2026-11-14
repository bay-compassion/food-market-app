import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import type { ManualAdmission } from '../../services/guestAdmission';
import { currentSessionState, type SessionCommand } from '../../services/sessionStateMachine';
import type { VisitStatus } from '../../services/visitStateMachine';
import { useRootStore } from '../../stores/react/store-context';
import { AddGuestSection } from './AddGuestSection';
import { HouseholdServiceRecorder } from './HouseholdServiceRecorder';
import { ResetSessionDisclosure } from './ResetSessionDisclosure';
import { SessionGuestList } from './SessionGuestList';
import { SessionPhasePlan } from './SessionPhasePlan';
import { SessionPhaseStatus } from './SessionPhaseStatus';
import { TodayPrintStation } from './TodayPrintStation';
import type { AdminView, ManualGuest, QueueGuest } from './types';

const Screen = styled.div`
	display: grid;
	gap: 16px;

	/* The section's usual bottom margin would double the gap. */
	.admin-section {
		margin-bottom: 0;
	}
`;

export type SessionViewProps = {
	statusLabels: Record<VisitStatus, string>;
	sessionGuests: QueueGuest[];
	admissions: ManualAdmission[];
	busy?: boolean;
	onRun: (action: SessionCommand) => void;
	onAddGuest: (guest: ManualGuest) => void;
	onNavigate: (view: AdminView) => void;
};

/**
 * The Today screen: where the market stands, what happens next, and the ways to step in. Only the
 * current phase's controls exist, and the server's phase decides which that is.
 */
export const SessionView = observer(function SessionView({
	statusLabels,
	sessionGuests,
	admissions,
	busy,
	onRun,
	onAddGuest,
	onNavigate,
}: SessionViewProps) {
	const { admin, session } = useRootStore();
	const event = session.currentState?.event ?? null;
	const phase = currentSessionState(event?.status);
	const showsRegisteredGuests =
		!!event && ['registration_open', 'registration_closed', 'lottery_pending'].includes(phase);

	return (
		<Screen>
			<SessionPhaseStatus
				statusLabels={statusLabels}
				busy={busy}
				onRun={onRun}
				onNavigate={onNavigate}
			/>

			{/* Wherever the session stands, the label printer can be checked before a tag is needed. */}
			{event && phase !== 'inactive' ? <TodayPrintStation /> : null}

			{event && phase === 'service_started' ? (
				<section className="admin-section">
					<HouseholdServiceRecorder key={event.id} marketEventId={event.id} />
				</section>
			) : null}

			{/* A worker can add someone by hand at any stage; only what "adding" means changes. */}
			<AddGuestSection admissions={admissions} busy={busy} onAddGuest={onAddGuest} />

			<SessionPhasePlan busy={busy} onRun={onRun} />

			{showsRegisteredGuests ? <SessionGuestList guests={sessionGuests} /> : null}

			{/* A session that never opened has nothing to reset. */}
			{event && phase !== 'scheduled' && phase !== 'inactive' && admin.can('manage:sessions') ? (
				<ResetSessionDisclosure busy={busy} onReset={() => onRun('reset_session')} />
			) : null}
		</Screen>
	);
});
