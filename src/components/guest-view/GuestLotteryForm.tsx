import { observer } from 'mobx-react-lite';

import { ageRanges, type AgeRange } from '../../services/ageRanges';
import type { SessionQuestion } from '../../stores/market-session.store';
import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';
import { FormField, type FormFieldOption } from '../FormField';
import { NumberSpinner } from '../NumberSpinner';

export type GuestLotteryFormProps = {
	/** The session's own questions, which vary per market event. Owned by the container, since it
	 *  is what knows which session is running. */
	registrationQuestions: SessionQuestion[];
};

/** The scale answers on offer, 1 through 10. */
const scaleValues = Array.from({ length: 10 }, (_, index) => index + 1);

/**
 * What entering the lottery asks for beyond identity: who the guest is shopping for, and whatever
 * the session itself wants to know.
 *
 * Rendered only when registration is genuinely open — signing up ahead of time collects identity
 * alone, since the household counts are what a specific market day needs.
 */
export const GuestLotteryForm = observer(function GuestLotteryForm({
	registrationQuestions,
}: GuestLotteryFormProps) {
	const t = useTranslation();
	const { registration } = useRootStore();
	const { guest } = registration;

	const ageRangeLabels: Record<AgeRange, string> = {
		'0-17': t.ageRange0to17,
		'18-29': t.ageRange18to29,
		'30-44': t.ageRange30to44,
		'45-59': t.ageRange45to59,
		'60-74': t.ageRange60to74,
		'75+': t.ageRange75plus,
	};
	const ageOptions: FormFieldOption[] = [
		{ value: '', label: t.agePlaceholder, disabled: true },
		...ageRanges.map((range) => ({ value: range, label: ageRangeLabels[range] })),
	];

	const scaleOptions: FormFieldOption[] = [
		{ value: '', label: t.chooseAnswer, disabled: true },
		...scaleValues.map((value) => ({ value: String(value), label: String(value) })),
	];

	/** The three counts differ only in their label, hint, and floor, so they share the rest. */
	const countProps = {
		required: true,
		max: 30,
		decrementLabel: t.countDecrementLabel,
		incrementLabel: t.countIncrementLabel,
	};

	return (
		<>
			<FormField
				label={t.age}
				type="select"
				value={guest.ageRange}
				onChange={(value) => registration.updateGuest({ ageRange: value as AgeRange | '' })}
				required
				options={ageOptions}
			/>
			<NumberSpinner
				{...countProps}
				label={t.household}
				hint={t.householdHint}
				// A household always has at least the guest in it, where the other two counts can
				// legitimately be nobody.
				min={1}
				value={guest.householdSize}
				onChange={(value) => registration.updateGuest({ householdSize: value })}
			/>
			<NumberSpinner
				{...countProps}
				label={t.childrenCount}
				min={0}
				value={guest.childrenCount}
				onChange={(value) => registration.updateGuest({ childrenCount: value })}
			/>
			<NumberSpinner
				{...countProps}
				label={t.seniorsCount}
				min={0}
				value={guest.seniorsCount}
				onChange={(value) => registration.updateGuest({ seniorsCount: value })}
			/>
			{registrationQuestions.map((question) =>
				question.type === 'scale' ? (
					<FormField
						key={question.id}
						label={question.prompt}
						type="select"
						value={registration.registrationAnswers[question.id] ?? ''}
						// The scale is stored as a number, matching the `v-model.number` this replaced —
						// the answers go to the API as they are held here.
						onChange={(value) => registration.setAnswer(question.id, Number(value))}
						required={question.required}
						options={scaleOptions}
					/>
				) : (
					<FormField
						key={question.id}
						label={question.prompt}
						type="textarea"
						rows={3}
						value={registration.registrationAnswers[question.id] ?? ''}
						onChange={(value) => registration.setAnswer(question.id, value)}
						// Trimmed on the way out rather than on every keystroke: trimming as the guest
						// types would eat the space between words as soon as it was pressed.
						onBlur={(value) => registration.setAnswer(question.id, value.trim())}
						required={question.required}
					/>
				),
			)}
		</>
	);
});
