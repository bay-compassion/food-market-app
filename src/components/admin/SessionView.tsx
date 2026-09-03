import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import type { GuestAdmission } from '../../services/guestAdmission';
import type { VisitStatus } from '../../services/visitStateMachine';
import { AddGuestSection } from './AddGuestSection';
import { SessionBroadcastForm, type Broadcast } from './SessionBroadcastForm';
import { SessionGuestList } from './SessionGuestList';
import { SessionOverview } from './SessionOverview';
import { SessionPhaseControls, type SessionPhaseControlsProps } from './SessionPhaseControls';
import { SessionStepper } from './SessionStepper';
import type { ManualGuest, QueueGuest } from './types';

export type SessionViewProps = SessionPhaseControlsProps & {
	statuses: VisitStatus[];
	counts: Partial<Record<VisitStatus, number>>;
	statusLabels: Record<VisitStatus, string>;
	registeredGuests: QueueGuest[];
	admissions: GuestAdmission[];
	broadcast: Broadcast;
	onBroadcastChange: (broadcast: Broadcast) => void;
	onAddGuest: (guest: ManualGuest) => void;
	onSendBroadcast: () => void;
};

const ResetCard = styled.section`
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	align-items: center;
	gap: 16px;

	p {
		max-width: 560px;
		color: var(--color-text-subtle);
		line-height: 1.5;
	}
`;

/** The session's own screen: whichever controls its current phase actually allows. */
export const SessionView = observer(function SessionView({
	event,
	sessionState,
	statuses,
	counts,
	statusLabels,
	registeredGuests,
	admissions,
	busy,
	broadcast,
	onBroadcastChange,
	onRun,
	onAddGuest,
	onSendBroadcast,
	...phaseControls
}: SessionViewProps) {
	const t = adminTranslations.en;

	const showsRegisteredGuests =
		!!event &&
		['registration_open', 'registration_closed', 'lottery_pending'].includes(sessionState);
	const showsBroadcast =
		!!event &&
		['registration_open', 'registration_closed', 'lottery_pending', 'service_started'].includes(
			sessionState,
		);

	return (
		<>
			{sessionState === 'service_started' ? (
				<SessionOverview statuses={statuses} counts={counts} statusLabels={statusLabels} />
			) : null}

			<SessionStepper
				sessionState={sessionState}
				sessionMode={event?.sessionMode ?? phaseControls.settings.sessionMode}
			>
				<SessionPhaseControls
					{...phaseControls}
					event={event}
					sessionState={sessionState}
					busy={busy}
					onRun={onRun}
				/>
			</SessionStepper>

			{showsRegisteredGuests ? <SessionGuestList guests={registeredGuests} /> : null}

			{/* A worker can add someone by hand at any stage; only what "adding" means changes. */}
			<AddGuestSection admissions={admissions} busy={busy} onAddGuest={onAddGuest} />

			{showsBroadcast ? (
				<SessionBroadcastForm
					broadcast={broadcast}
					onBroadcastChange={onBroadcastChange}
					busy={busy}
					onSend={onSendBroadcast}
				/>
			) : null}

			{event ? (
				<ResetCard className="admin-section reset-card">
					<div>
						<h2>{t.resetSession}</h2>
						<p>{t.resetSessionHelp}</p>
					</div>
					<Button
						type="button"
						variant="outlined"
						color="error"
						disabled={busy}
						onClick={() => onRun('reset_session')}
					>
						{t.resetSession}
					</Button>
				</ResetCard>
			) : null}
		</>
	);
});
