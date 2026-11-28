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
	/** Null when the market publishes no shopping time. */
	shoppingStartsAt: DateTime | null;
};

/**
 * The day a wall-clock time is placed on for the picker. January has no daylight saving transition
 * in any US zone, so every time of day exists on it exactly once.
 */
const timeReferenceDate = '2000-01-01';

/** A wall-clock `HH:mm` as the picker's value. */
function pickerTime(time: string, timeZone: string): DateTime {
	return DateTime.fromISO(`${timeReferenceDate}T${time.slice(0, 5)}`, { zone: timeZone });
}

export function draftFrom(
	template: Omit<SessionTemplate, 'questions'>,
	timeZone: string,
): TemplateDraft {
	return {
		registrationOpensAt: pickerTime(template.registrationOpensAt, timeZone),
		registrationDurationMinutes: template.registrationDurationMinutes,
		capacity: template.capacity,
		lotteryDelayMinutes: template.lotteryDelayMinutes ?? '',
		autoCloseAfterHours:
			template.autoCloseAfterMinutes === null ? '' : template.autoCloseAfterMinutes / 60,
		shoppingStartsAt: template.shoppingStartsAt
			? pickerTime(template.shoppingStartsAt, timeZone)
			: null,
	};
}

/** Minutes past midnight of a picker's wall-clock time. */
function minuteOfDay(time: DateTime): number {
	return time.hour * 60 + time.minute;
}

/**
 * Whether the draft's shopping time comes no later than registration closes, which the server
 * refuses. Unknowable, and so false, while either time is missing or half-typed.
 */
export function shoppingStartsTooEarly(draft: TemplateDraft): boolean {
	const { registrationOpensAt: opens, shoppingStartsAt: shopping } = draft;

	if (!opens?.isValid || !shopping?.isValid || draft.registrationDurationMinutes === '') {
		return false;
	}

	return minuteOfDay(shopping) <= minuteOfDay(opens) + draft.registrationDurationMinutes;
}

/** The template a draft describes, or null while a field is empty, half-typed, or out of order. */
export function templateFrom(draft: TemplateDraft): Omit<SessionTemplate, 'questions'> | null {
	if (
		!draft.registrationOpensAt?.isValid ||
		draft.registrationDurationMinutes === '' ||
		draft.capacity === '' ||
		// Optional, but a half-typed time is not the same as none.
		(draft.shoppingStartsAt !== null && !draft.shoppingStartsAt.isValid) ||
		shoppingStartsTooEarly(draft)
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
		shoppingStartsAt: draft.shoppingStartsAt?.toFormat('HH:mm') ?? null,
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
	const shoppingTooEarly = shoppingStartsTooEarly(draft);

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
			<TimePicker
				label={t.scheduleShoppingStarts}
				timezone={timeZone}
				value={draft.shoppingStartsAt}
				onChange={(value) => update({ shoppingStartsAt: value })}
				slotProps={{
					field: { clearable: true },
					textField: {
						error: shoppingTooEarly,
						helperText: shoppingTooEarly
							? t.scheduleShoppingStartsTooEarly
							: t.scheduleShoppingStartsHelp,
					},
				}}
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
