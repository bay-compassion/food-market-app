import styled from '@emotion/styled';
import { Button } from '@mui/material';
import type { FormEvent } from 'react';

import { adminTranslations } from '../../adminLocales';
import type { SessionSettings } from './types';

export type SessionSettingsFormProps = {
	busy?: boolean;
	settings: SessionSettings;
	onSettingsChange: (settings: SessionSettings) => void;
	onSave: () => void;
	onSaveAndStart: () => void;
};

const Section = styled.section`
	.mode-help {
		margin: -6px 0 0;
		color: var(--color-text-subtle);
		font-size: 14px;
		line-height: 1.5;
	}

	.form-actions {
		display: grid;
		gap: 10px;
	}

	@media (min-width: 560px) {
		.form-actions {
			grid-template-columns: auto auto;
			justify-content: end;
		}
	}
`;

/** When registration opens and closes, and how many places the session has. */
export function SessionSettingsForm({
	busy,
	settings,
	onSettingsChange,
	onSave,
	onSaveAndStart,
}: SessionSettingsFormProps) {
	const t = adminTranslations.en;

	function update(patch: Partial<SessionSettings>) {
		onSettingsChange({ ...settings, ...patch });
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		onSave();
	}

	return (
		<Section className="admin-section settings-card">
			<h2>{t.registrationSettings}</h2>
			<p>{t.startSessionHelp}</p>
			<form onSubmit={handleSubmit}>
				<label>
					<span>{t.sessionType}</span>
					<select
						value={settings.sessionMode}
						onChange={(event) =>
							update({ sessionMode: event.target.value as SessionSettings['sessionMode'] })
						}
					>
						<option value="scheduled">{t.scheduledSession}</option>
						<option value="ad_hoc">{t.adHocSession}</option>
					</select>
				</label>
				<p className="mode-help">
					{settings.sessionMode === 'scheduled' ? t.scheduledSessionHelp : t.adHocSessionHelp}
				</p>
				{settings.sessionMode === 'scheduled' ? (
					<div className="field-row">
						<label>
							<span>{t.opensAt}</span>
							<input
								type="datetime-local"
								required
								value={settings.registrationOpensAt}
								onChange={(event) => update({ registrationOpensAt: event.target.value })}
							/>
						</label>
						<label>
							<span>{t.registrationDurationMinutes}</span>
							<input
								type="number"
								min="1"
								max="1440"
								step="1"
								list="registration-duration-options"
								required
								value={settings.durationMinutes}
								onChange={(event) => update({ durationMinutes: Number(event.target.value) })}
							/>
						</label>
					</div>
				) : null}
				<datalist id="registration-duration-options">
					<option value="30" />
					<option value="60" />
					<option value="90" />
					<option value="120" />
				</datalist>
				{settings.sessionMode === 'ad_hoc' ? (
					<label>
						<span>{t.closesAt}</span>
						<input
							type="datetime-local"
							required
							value={settings.adHocClosesAt}
							onChange={(event) => update({ adHocClosesAt: event.target.value })}
						/>
					</label>
				) : null}
				<label>
					<span>{t.capacity}</span>
					<input
						type="number"
						min="1"
						max="10000"
						required
						value={settings.capacity}
						onChange={(event) => update({ capacity: Number(event.target.value) })}
					/>
				</label>
				<div className="form-actions">
					<Button type="submit" variant="outlined" disabled={busy}>
						{t.saveSettings}
					</Button>
					<Button type="button" disabled={busy} onClick={onSaveAndStart}>
						{settings.sessionMode === 'scheduled' ? t.scheduleRegistration : t.openRegistration}
					</Button>
				</div>
			</form>
		</Section>
	);
}
