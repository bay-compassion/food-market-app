import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';
import type { FormEvent } from 'react';

import { adminTranslations } from '../../adminLocales';
import type { CurrentSessionState, SessionCommand } from '../../services/sessionStateMachine';
import { NumberSpinner } from '../NumberSpinner';
import { CapacityOverrideForm } from './CapacityOverrideForm';
import { LotteryPendingCard } from './LotteryPendingCard';
import { SessionActionCard } from './SessionActionCard';
import { SessionOverrideCard } from './SessionOverrideCard';
import { SessionTransitionTimer } from './SessionTransitionTimer';
import type { AdminMarketEvent } from './types';

export type SessionPhaseControlsProps = {
	event: AdminMarketEvent | null;
	sessionState: CurrentSessionState;
	busy?: boolean;
	extensionMinutes: number;
	onExtensionMinutesChange: (minutes: number) => void;
	postponementMinutes: number;
	onPostponementMinutesChange: (minutes: number) => void;
	onPostponeRegistration: () => void;
	onExtendRegistration: () => void;
	onSaveCapacityOverride: (capacity: number) => void;
	onRun: (action: SessionCommand) => void;
	onNavigateQueue: () => void;
	onNavigateSchedule: () => void;
};

export const SessionPhaseControls = observer(function SessionPhaseControls({
	event,
	sessionState,
	busy,
	extensionMinutes,
	onExtensionMinutesChange,
	postponementMinutes,
	onPostponementMinutesChange,
	onPostponeRegistration,
	onExtendRegistration,
	onSaveCapacityOverride,
	onRun,
	onNavigateQueue,
	onNavigateSchedule,
}: SessionPhaseControlsProps) {
	const t = adminTranslations.en;

	function submitting(handler: () => void) {
		return (formEvent: FormEvent<HTMLFormElement>) => {
			formEvent.preventDefault();
			handler();
		};
	}

	return (
		<>
			{sessionState === 'inactive' ? (
				<SessionActionCard description={t.noSessionHelp}>
					<Button type="button" onClick={onNavigateSchedule}>
						{t.scheduleOpenSchedule}
					</Button>
				</SessionActionCard>
			) : sessionState === 'scheduled' ? (
				<SessionOverrideCard
					action={
						<Button type="button" disabled={busy} onClick={() => onRun('open_registration')}>
							{t.openRegistrationNow}
						</Button>
					}
				>
					<form onSubmit={submitting(onPostponeRegistration)}>
						<NumberSpinner
							disabled={busy}
							label={t.postponeByMinutes}
							value={postponementMinutes}
							min={1}
							max={1440}
							required
							onChange={(value) => onPostponementMinutesChange(Number(value))}
							decrementLabel={t.decreaseNumber}
							incrementLabel={t.increaseNumber}
						/>
						<Button type="submit" variant="outlined" disabled={busy}>
							{t.postponeRegistration}
						</Button>
					</form>
				</SessionOverrideCard>
			) : sessionState === 'registration_open' ? (
				<SessionOverrideCard
					action={
						<Button type="button" disabled={busy} onClick={() => onRun('close_registration')}>
							{t.closeRegistration}
						</Button>
					}
				>
					<form onSubmit={submitting(onExtendRegistration)}>
						<NumberSpinner
							disabled={busy}
							label={t.extendRegistrationMinutes}
							value={extensionMinutes}
							min={1}
							max={1440}
							required
							onChange={(value) => onExtensionMinutesChange(Number(value))}
							decrementLabel={t.decreaseNumber}
							incrementLabel={t.increaseNumber}
						/>
						<Button type="submit" variant="outlined" disabled={busy}>
							{t.extendRegistration}
						</Button>
					</form>
					<CapacityOverrideForm
						key={event!.id}
						capacity={event!.capacity}
						busy={busy}
						onSave={onSaveCapacityOverride}
					/>
				</SessionOverrideCard>
			) : sessionState === 'registration_closed' ? (
				<SessionActionCard description={t.registrationClosedHelp}>
					<SessionTransitionTimer kind="grace" />
					<Button
						type="button"
						variant="outlined"
						disabled={busy}
						onClick={() => onRun('reopen_registration')}
					>
						{t.reopenRegistration}
					</Button>
				</SessionActionCard>
			) : sessionState === 'lottery_pending' ? (
				<LotteryPendingCard busy={busy} onRun={onRun} />
			) : (
				<SessionActionCard>
					<Button type="button" onClick={onNavigateQueue}>
						{t.goToQueue}
					</Button>
				</SessionActionCard>
			)}
		</>
	);
});
