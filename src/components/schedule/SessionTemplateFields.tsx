import { adminTranslations } from '../../adminLocales';
import type { SessionTemplate } from '../../services/schedule-payload';

/** A session template as the form edits it: the optional numbers are strings, empty meaning none. */
export type TemplateDraft = {
	registrationOpensAt: string;
	registrationDurationMinutes: string;
	capacity: string;
	lotteryDelayMinutes: string;
	autoCloseAfterHours: string;
};

export function draftFrom(template: Omit<SessionTemplate, 'questions'>): TemplateDraft {
	return {
		registrationOpensAt: template.registrationOpensAt,
		registrationDurationMinutes: String(template.registrationDurationMinutes),
		capacity: String(template.capacity),
		lotteryDelayMinutes: template.lotteryDelayMinutes?.toString() ?? '',
		autoCloseAfterHours:
			template.autoCloseAfterMinutes === null ? '' : String(template.autoCloseAfterMinutes / 60),
	};
}

export function templateFrom(draft: TemplateDraft): Omit<SessionTemplate, 'questions'> {
	return {
		registrationOpensAt: draft.registrationOpensAt,
		registrationDurationMinutes: Number(draft.registrationDurationMinutes),
		capacity: Number(draft.capacity),
		lotteryDelayMinutes:
			draft.lotteryDelayMinutes === '' ? null : Number(draft.lotteryDelayMinutes),
		autoCloseAfterMinutes:
			draft.autoCloseAfterHours === '' ? null : Math.round(Number(draft.autoCloseAfterHours) * 60),
	};
}

export type SessionTemplateFieldsProps = {
	draft: TemplateDraft;
	onChange: (draft: TemplateDraft) => void;
};

/** The fields a recurrence pattern and a single session share. */
export function SessionTemplateFields({ draft, onChange }: SessionTemplateFieldsProps) {
	const t = adminTranslations.en;
	const update = (patch: Partial<TemplateDraft>) => onChange({ ...draft, ...patch });

	return (
		<>
			<div className="field-row">
				<label>
					<span>{t.scheduleOpensAt}</span>
					<input
						type="time"
						required
						value={draft.registrationOpensAt}
						onChange={(event) => update({ registrationOpensAt: event.target.value })}
					/>
				</label>
				<label>
					<span>{t.scheduleDuration}</span>
					<input
						type="number"
						min="1"
						max="1440"
						required
						value={draft.registrationDurationMinutes}
						onChange={(event) => update({ registrationDurationMinutes: event.target.value })}
					/>
				</label>
			</div>
			<label>
				<span>{t.capacity}</span>
				<input
					type="number"
					min="1"
					max="10000"
					required
					value={draft.capacity}
					onChange={(event) => update({ capacity: event.target.value })}
				/>
			</label>
			<label>
				<span>{t.scheduleLotteryDelay}</span>
				<input
					type="number"
					min="0"
					max="120"
					aria-describedby="schedule-lottery-delay-help"
					value={draft.lotteryDelayMinutes}
					onChange={(event) => update({ lotteryDelayMinutes: event.target.value })}
				/>
				<small id="schedule-lottery-delay-help">{t.scheduleLotteryDelayHelp}</small>
			</label>
			<label>
				<span>{t.scheduleAutoClose}</span>
				<input
					type="number"
					min="0.5"
					step="0.5"
					aria-describedby="schedule-auto-close-help"
					value={draft.autoCloseAfterHours}
					onChange={(event) => update({ autoCloseAfterHours: event.target.value })}
				/>
				<small id="schedule-auto-close-help">{t.scheduleAutoCloseHelp}</small>
			</label>
		</>
	);
}
