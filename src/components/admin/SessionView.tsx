import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';
import type { FormEvent } from 'react';

import { adminTranslations } from '../../adminLocales';
import type { GuestAdmission } from '../../services/guestAdmission';
import type { CurrentSessionState, SessionCommand } from '../../services/sessionStateMachine';
import type { VisitStatus } from '../../services/visitStateMachine';
import { useRootStore } from '../../stores/react/store-context';
import { AddGuestSection } from './AddGuestSection';
import { SessionActionCard } from './SessionActionCard';
import { SessionBroadcastForm, type Broadcast } from './SessionBroadcastForm';
import { SessionGuestList } from './SessionGuestList';
import { SessionOverrideCard } from './SessionOverrideCard';
import { SessionOverview } from './SessionOverview';
import { SessionSettingsForm } from './SessionSettingsForm';
import type { AdminMarketEvent, ManualGuest, QueueGuest, SessionSettings } from './types';

export type SessionViewProps = {
	event: AdminMarketEvent | null;
	sessionState: CurrentSessionState;
	statuses: VisitStatus[];
	counts: Partial<Record<VisitStatus, number>>;
	statusLabels: Record<VisitStatus, string>;
	registeredGuests: QueueGuest[];
	admissions: GuestAdmission[];
	busy?: boolean;
	settings: SessionSettings;
	onSettingsChange: (settings: SessionSettings) => void;
	extensionMinutes: number;
	onExtensionMinutesChange: (minutes: number) => void;
	postponementMinutes: number;
	onPostponementMinutesChange: (minutes: number) => void;
	broadcast: Broadcast;
	onBroadcastChange: (broadcast: Broadcast) => void;
	onSaveSettings: () => void;
	onSaveAndStartRegistration: () => void;
	onPostponeRegistration: () => void;
	onExtendRegistration: () => void;
	onSaveCapacityOverride: () => void;
	onRun: (action: SessionCommand) => void;
	onAddGuest: (guest: ManualGuest) => void;
	onSendBroadcast: () => void;
	onNavigateQueue: () => void;
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
	settings,
	onSettingsChange,
	extensionMinutes,
	onExtensionMinutesChange,
	postponementMinutes,
	onPostponementMinutesChange,
	broadcast,
	onBroadcastChange,
	onSaveSettings,
	onSaveAndStartRegistration,
	onPostponeRegistration,
	onExtendRegistration,
	onSaveCapacityOverride,
	onRun,
	onAddGuest,
	onSendBroadcast,
	onNavigateQueue,
}: SessionViewProps) {
	const t = adminTranslations.en;
	const { translations } = useRootStore();

	const showsRegisteredGuests =
		!!event &&
		['registration_open', 'registration_closed', 'lottery_pending'].includes(sessionState);
	const showsBroadcast =
		!!event &&
		['registration_open', 'registration_closed', 'lottery_pending', 'service_started'].includes(
			sessionState,
		);

	function formatEventDate(value: string) {
		return new Intl.DateTimeFormat(translations.locale, {
			dateStyle: 'medium',
			timeStyle: 'short',
		}).format(new Date(value));
	}

	function submitting(handler: () => void) {
		return (formEvent: FormEvent<HTMLFormElement>) => {
			formEvent.preventDefault();
			handler();
		};
	}

	return (
		<>
			{sessionState === 'service_started' ? (
				<SessionOverview statuses={statuses} counts={counts} statusLabels={statusLabels} />
			) : null}

			{sessionState === 'inactive' ? (
				<SessionSettingsForm
					settings={settings}
					onSettingsChange={onSettingsChange}
					busy={busy}
					onSave={onSaveSettings}
					onSaveAndStart={onSaveAndStartRegistration}
				/>
			) : sessionState === 'scheduled' ? (
				<SessionOverrideCard
					title={t.scheduled}
					description={
						<>
							{t.scheduledFor} {formatEventDate(event!.registrationOpensAt)}
						</>
					}
					action={
						<Button type="button" disabled={busy} onClick={() => onRun('open_registration')}>
							{t.openRegistrationNow}
						</Button>
					}
				>
					<form onSubmit={submitting(onPostponeRegistration)}>
						<label>
							<span>{t.postponeByMinutes}</span>
							<input
								type="number"
								min="1"
								max="1440"
								step="1"
								required
								value={postponementMinutes}
								onChange={(changeEvent) =>
									onPostponementMinutesChange(Number(changeEvent.target.value))
								}
							/>
						</label>
						<Button type="submit" variant="outlined" disabled={busy}>
							{t.postponeRegistration}
						</Button>
					</form>
				</SessionOverrideCard>
			) : sessionState === 'registration_open' ? (
				<SessionOverrideCard
					title={t.registrationOverrides}
					description={t.overridesHelp}
					action={
						<Button type="button" disabled={busy} onClick={() => onRun('close_registration')}>
							{t.closeRegistration}
						</Button>
					}
				>
					<form onSubmit={submitting(onExtendRegistration)}>
						<label>
							<span>{t.extendRegistrationMinutes}</span>
							<input
								type="number"
								min="1"
								max="1440"
								step="1"
								list="registration-extension-options"
								required
								value={extensionMinutes}
								onChange={(changeEvent) =>
									onExtensionMinutesChange(Number(changeEvent.target.value))
								}
							/>
						</label>
						<datalist id="registration-extension-options">
							<option value="15" />
							<option value="30" />
							<option value="60" />
						</datalist>
						<Button type="submit" variant="outlined" disabled={busy}>
							{t.extendRegistration}
						</Button>
					</form>
					<form onSubmit={submitting(onSaveCapacityOverride)}>
						<label>
							<span>{t.capacity}</span>
							<input
								type="number"
								min="1"
								max="10000"
								required
								value={settings.capacity}
								onChange={(changeEvent) =>
									onSettingsChange({ ...settings, capacity: Number(changeEvent.target.value) })
								}
							/>
						</label>
						<Button type="submit" variant="outlined" disabled={busy}>
							{t.updateCapacity}
						</Button>
					</form>
				</SessionOverrideCard>
			) : sessionState === 'registration_closed' ? (
				<SessionActionCard title={t.closed} description={t.guestList}>
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
				<SessionActionCard title={t.lotteryActions} description={t.lotteryPendingHelp}>
					<Button type="button" disabled={busy} onClick={() => onRun('run_lottery')}>
						{t.runLottery}
					</Button>
				</SessionActionCard>
			) : (
				<SessionActionCard title={t.serviceStarted} description={t.guestList}>
					<Button type="button" onClick={onNavigateQueue}>
						{t.goToQueue}
					</Button>
				</SessionActionCard>
			)}

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
