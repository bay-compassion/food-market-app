import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import type { FormEvent } from 'react';

import { adminTranslations } from '../../adminLocales';
import type { GuestAdmission } from '../../services/guestAdmission';
import type { CurrentSessionState, SessionCommand } from '../../services/sessionStateMachine';
import type { VisitStatus } from '../../services/visitStateMachine';
import { useRootStore } from '../../stores/react/store-context';
import { AppButton } from '../AppButton';
import { AddGuestSection } from './AddGuestSection';
import { SessionBroadcastForm, type Broadcast } from './SessionBroadcastForm';
import { SessionGuestList } from './SessionGuestList';
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

const StatGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 10px;
	margin-top: 14px;

	.stat-card {
		display: grid;
		gap: 2px;
		min-height: 92px;
		padding: 15px;
		border-radius: var(--radius-md);
		color: white;
		background: var(--color-brand);
	}

	.stat-card:first-of-type {
		grid-column: span 2;
	}

	.stat-card strong {
		font-family: var(--font-heading);
		font-size: 32px;
	}

	.stat-card span {
		font-size: 13px;
	}

	@media (min-width: 560px) {
		grid-template-columns: repeat(5, 1fr);

		.stat-card:first-of-type {
			grid-column: auto;
		}
	}
`;

const ActionCard = styled.section`
	display: flex;
	justify-content: space-between;
	gap: 14px;
	align-items: flex-start;

	.action-buttons {
		display: grid;
		gap: 10px;
		width: 100%;
	}

	@media (min-width: 560px) {
		align-items: center;

		.action-buttons {
			width: auto;
		}
	}
`;

const OverrideCard = styled.section`
	.override-grid {
		display: grid;
		gap: 18px;
	}

	.override-grid form {
		margin-top: 0;
		padding: 16px;
		border-radius: var(--radius-md);
		background: #f3f6f4;
	}

	.standalone-action {
		display: flex;
		justify-content: flex-end;
		margin-top: 18px;
		padding-top: 18px;
		border-top: 1px solid #dce3df;
	}

	@media (min-width: 560px) {
		.override-grid {
			grid-template-columns: 1fr 1fr;
		}
	}
`;

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

	.app-button.secondary {
		color: var(--color-error);
		box-shadow: inset 0 0 0 1.5px var(--color-error);
	}

	.app-button.secondary:hover:not(:disabled) {
		color: white;
		background: var(--color-error);
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
				<section className="admin-section">
					<h2>{t.overview}</h2>
					<StatGrid className="stat-grid">
						{statuses.map((status) => (
							<article key={status} className="stat-card">
								<strong>{counts[status] ?? 0}</strong>
								<span>{statusLabels[status]}</span>
							</article>
						))}
					</StatGrid>
				</section>
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
				<OverrideCard className="admin-section settings-card">
					<h2>{t.scheduled}</h2>
					<p>
						{t.scheduledFor} {formatEventDate(event!.registrationOpensAt)}
					</p>
					<div className="override-grid">
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
							<AppButton
								type="submit"
								variant="secondary"
								disabled={busy}
								label={t.postponeRegistration}
							/>
						</form>
					</div>
					<div className="standalone-action">
						<AppButton
							type="button"
							disabled={busy}
							onClick={() => onRun('open_registration')}
							label={t.openRegistrationNow}
						/>
					</div>
				</OverrideCard>
			) : sessionState === 'registration_open' ? (
				<OverrideCard className="admin-section settings-card">
					<h2>{t.registrationOverrides}</h2>
					<p>{t.overridesHelp}</p>
					<div className="override-grid">
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
							<AppButton
								type="submit"
								variant="secondary"
								disabled={busy}
								label={t.extendRegistration}
							/>
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
							<AppButton
								type="submit"
								variant="secondary"
								disabled={busy}
								label={t.updateCapacity}
							/>
						</form>
					</div>
					<div className="standalone-action">
						<AppButton
							type="button"
							disabled={busy}
							onClick={() => onRun('close_registration')}
							label={t.closeRegistration}
						/>
					</div>
				</OverrideCard>
			) : sessionState === 'registration_closed' ? (
				<ActionCard className="admin-section action-card">
					<div>
						<h2>{t.closed}</h2>
						<p>{t.guestList}</p>
					</div>
					<div className="action-buttons">
						<AppButton
							type="button"
							variant="secondary"
							disabled={busy}
							onClick={() => onRun('reopen_registration')}
							label={t.reopenRegistration}
						/>
					</div>
				</ActionCard>
			) : sessionState === 'lottery_pending' ? (
				<ActionCard className="admin-section action-card">
					<div>
						<h2>{t.lotteryActions}</h2>
						<p>{t.lotteryPendingHelp}</p>
					</div>
					<div className="action-buttons">
						<AppButton
							type="button"
							disabled={busy}
							onClick={() => onRun('run_lottery')}
							label={t.runLottery}
						/>
					</div>
				</ActionCard>
			) : (
				<ActionCard className="admin-section action-card">
					<div>
						<h2>{t.serviceStarted}</h2>
						<p>{t.guestList}</p>
					</div>
					<div className="action-buttons">
						<AppButton type="button" onClick={onNavigateQueue} label={t.goToQueue} />
					</div>
				</ActionCard>
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
					<AppButton
						type="button"
						variant="secondary"
						disabled={busy}
						onClick={() => onRun('reset_session')}
						label={t.resetSession}
					/>
				</ResetCard>
			) : null}
		</>
	);
});
