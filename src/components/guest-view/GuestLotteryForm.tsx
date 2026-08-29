import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { ageRanges, type AgeRange } from '../../services/ageRanges';
import type { SessionQuestion } from '../../stores/market-session.store';
import { useRootStore } from '../../stores/react/store-context';
import { useTranslation } from '../../stores/react/use-translation';
import { CollapsingCountField } from '../CollapsingCountField';
import { FormField, type FormFieldOption } from '../FormField';

export type GuestLotteryFormProps = {
	/** The session's own questions, which vary per market event. Owned by the container, since it
	 *  is what knows which session is running. */
	registrationQuestions: SessionQuestion[];
};

/** The scale answers on offer, 1 through 10. */
const scaleValues = Array.from({ length: 10 }, (_, index) => index + 1);

const Question = styled.label`
	display: grid;
	gap: 8px;

	> span {
		font-family: var(--font-heading);
		font-size: 16px;
		font-weight: 700;
	}

	select,
	textarea {
		width: 100%;
		padding: 14px 16px;
		border: 2px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text);
		background: var(--color-background);
		font-family: var(--font-body);
		font-size: 16px;
		font-weight: 400;
	}
`;

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

	/** The three counts differ only in their label and hint, so they share everything else. */
	const countProps = {
		required: true,
		max: 30,
		otherLabel: t.countOtherLabel,
		otherPlaceholder: t.countOtherPlaceholder,
		backLabel: t.countBackLabel,
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
			<CollapsingCountField
				{...countProps}
				label={t.household}
				hint={t.householdHint}
				options={[1, 2, 3, 4]}
				value={guest.householdSize}
				onChange={(value) => registration.updateGuest({ householdSize: value })}
			/>
			<CollapsingCountField
				{...countProps}
				label={t.childrenCount}
				value={guest.childrenCount}
				onChange={(value) => registration.updateGuest({ childrenCount: value })}
			/>
			<CollapsingCountField
				{...countProps}
				label={t.seniorsCount}
				value={guest.seniorsCount}
				onChange={(value) => registration.updateGuest({ seniorsCount: value })}
			/>
			{registrationQuestions.map((question) => (
				<Question key={question.id} className="dynamic-question">
					<span>{question.prompt}</span>
					{question.type === 'scale' ? (
						<select
							value={registration.registrationAnswers[question.id] ?? ''}
							required={question.required}
							// The scale is stored as a number, matching the `v-model.number` this replaced —
							// the answers go to the API as they are held here.
							onChange={(event) => registration.setAnswer(question.id, Number(event.target.value))}
						>
							<option value="" disabled>
								{t.chooseAnswer}
							</option>
							{scaleValues.map((value) => (
								<option key={value} value={value}>
									{value}
								</option>
							))}
						</select>
					) : (
						<textarea
							value={registration.registrationAnswers[question.id] ?? ''}
							required={question.required}
							rows={3}
							// Trimmed on the way out rather than on every keystroke: trimming as the guest
							// types would eat the space between words as soon as it was pressed.
							onChange={(event) => registration.setAnswer(question.id, event.target.value)}
							onBlur={(event) => registration.setAnswer(question.id, event.target.value.trim())}
						/>
					)}
				</Question>
			))}
		</>
	);
});
