import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { DateTime } from 'luxon';

import { adminTranslations } from '../../adminLocales';
import type { SessionTemplate } from '../../services/schedule-payload';
import { NumberSpinner } from '../NumberSpinner';

/**
 * A session template as the form edits it. The time is the picker's own value, so a half-typed
 * time survives until it is finished; an empty count is `''`, which for the optional ones means
 * none.
 */
export type TemplateDraft = {
	registrationOpensAt: DateTime | null;
	registrationDurationMinutes: number | '';
	capacity: number | '';
	lotteryDelayMinutes: number | '';
	autoCloseAfterHours: number | '';
};

/**
 * The day a wall-clock time is placed on for the picker. January has no daylight saving transition
 * in any US zone, so every time of day exists on it exactly once.
 */
const timeReferenceDate = '2000-01-01';

export function draftFrom(
	template: Omit<SessionTemplate, 'questions'>,
	timeZone: string,
): TemplateDraft {
	return {
		registrationOpensAt: DateTime.fromISO(
			`${timeReferenceDate}T${template.registrationOpensAt.slice(0, 5)}`,
			{ zone: timeZone },
		),
		registrationDurationMinutes: template.registrationDurationMinutes,
		capacity: template.capacity,
		lotteryDelayMinutes: template.lotteryDelayMinutes ?? '',
		autoCloseAfterHours:
			template.autoCloseAfterMinutes === null ? '' : template.autoCloseAfterMinutes / 60,
	};
}

/** The template a draft describes, or null while a required field is empty or half-typed. */
export function templateFrom(draft: TemplateDraft): Omit<SessionTemplate, 'questions'> | null {
	if (
		!draft.registrationOpensAt?.isValid ||
		draft.registrationDurationMinutes === '' ||
		draft.capacity === ''
	) {
		return null;
	}

	return {
		registrationOpensAt: draft.registrationOpensAt.toFormat('HH:mm'),
		registrationDurationMinutes: draft.registrationDurationMinutes,
		capacity: draft.capacity,
		lotteryDelayMinutes: draft.lotteryDelayMinutes === '' ? null : draft.lotteryDelayMinutes,
		autoCloseAfterMinutes:
			draft.autoCloseAfterHours === '' ? null : Math.round(draft.autoCloseAfterHours * 60),
	};
}

export type SessionTemplateFieldsProps = {
	draft: TemplateDraft;
	timeZone: string;
	onChange: (draft: TemplateDraft) => void;
};

/** The fields a recurrence pattern and a single session share. */
export function SessionTemplateFields({ draft, timeZone, onChange }: SessionTemplateFieldsProps) {
	const t = adminTranslations.en;
	const update = (patch: Partial<TemplateDraft>) => onChange({ ...draft, ...patch });
	const stepLabels = { decrementLabel: t.scheduleDecrease, incrementLabel: t.scheduleIncrease };
	const asCount = (value: number | string) => (value === '' ? '' : Number(value));

	return (
		<>
			<TimePicker
				label={t.scheduleOpensAt}
				timezone={timeZone}
				value={draft.registrationOpensAt}
				onChange={(value) => update({ registrationOpensAt: value })}
			/>
			<NumberSpinner
				{...stepLabels}
				label={t.scheduleDuration}
				// The hidden native input validates the value against `min` plus a whole number of
				// steps, so stepping by 5 needs a minimum that is itself a multiple of 5.
				min={5}
				max={1440}
				step={5}
				required
				value={draft.registrationDurationMinutes}
				onChange={(value) => update({ registrationDurationMinutes: asCount(value) })}
			/>
			<NumberSpinner
				{...stepLabels}
				label={t.capacity}
				min={1}
				max={10000}
				required
				value={draft.capacity}
				onChange={(value) => update({ capacity: asCount(value) })}
			/>
			<NumberSpinner
				{...stepLabels}
				label={t.scheduleLotteryDelay}
				hint={t.scheduleLotteryDelayHelp}
				placeholder={t.scheduleLotteryManual}
				clearLabel={t.scheduleClearLotteryDelay}
				min={0}
				max={120}
				value={draft.lotteryDelayMinutes}
				onChange={(value) => update({ lotteryDelayMinutes: asCount(value) })}
			/>
			<NumberSpinner
				{...stepLabels}
				label={t.scheduleAutoClose}
				hint={t.scheduleAutoCloseHelp}
				placeholder={t.scheduleAutoCloseNever}
				clearLabel={t.scheduleClearAutoClose}
				min={0.5}
				step={0.5}
				value={draft.autoCloseAfterHours}
				onChange={(value) => update({ autoCloseAfterHours: asCount(value) })}
			/>
		</>
	);
}
