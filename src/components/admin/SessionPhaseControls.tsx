import { Button } from '@mui/material';
import { observer } from 'mobx-react-lite';
import type { FormEvent } from 'react';

import { adminTranslations } from '../../adminLocales';
import type { CurrentSessionState, SessionCommand } from '../../services/sessionStateMachine';
import { useRootStore } from '../../stores/react/store-context';
import { SessionActionCard } from './SessionActionCard';
import { SessionOverrideCard } from './SessionOverrideCard';
import { SessionSettingsForm } from './SessionSettingsForm';
import type { AdminMarketEvent, SessionSettings } from './types';

export type SessionPhaseControlsProps = {
	event: AdminMarketEvent | null;
	sessionState: CurrentSessionState;
	busy?: boolean;
	settings: SessionSettings;
	onSettingsChange: (settings: SessionSettings) => void;
	extensionMinutes: number;
	onExtensionMinutesChange: (minutes: number) => void;
	postponementMinutes: number;
	onPostponementMinutesChange: (minutes: number) => void;
	onSaveSettings: () => void;
	onSaveAndStartRegistration: () => void;
	onPostponeRegistration: () => void;
	onExtendRegistration: () => void;
	onSaveCapacityOverride: () => void;
	onRun: (action: SessionCommand) => void;
	onNavigateQueue: () => void;
};

export const SessionPhaseControls = observer(function SessionPhaseControls({
	event,
	sessionState,
	busy,
	settings,
	onSettingsChange,
	extensionMinutes,
	onExtensionMinutesChange,
	postponementMinutes,
	onPostponementMinutesChange,
	onSaveSettings,
	onSaveAndStartRegistration,
	onPostponeRegistration,
	onExtendRegistration,
	onSaveCapacityOverride,
	onRun,
	onNavigateQueue,
}: SessionPhaseControlsProps) {
	const t = adminTranslations.en;
	const { translations } = useRootStore();

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
				<SessionActionCard description={t.registrationClosedHelp}>
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
				<SessionActionCard description={t.guestList}>
					<Button type="button" onClick={onNavigateQueue}>
						{t.goToQueue}
					</Button>
				</SessionActionCard>
			)}
		</>
	);
});
