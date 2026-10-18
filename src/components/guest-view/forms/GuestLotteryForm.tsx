import { TextField } from '@mui/material';
import { observer } from 'mobx-react-lite';

import type { GuestFormCopy } from '../../../locales';
import { HouseholdComposition, type HouseholdCount } from '../../../models/household-composition';
import { ageRanges, type AgeRange } from '../../../services/ageRanges';
import type { SessionQuestion } from '../../../stores/market-session.store';
import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';
import { NumberSpinner } from '../../NumberSpinner';
import { FormSection } from './FormSection';
import { useGuestFormCopy } from './use-guest-form-copy';

export type GuestLotteryFormProps = {
	/** The session's own questions, which vary per market event. Owned by the container, since it
	 *  is what knows which session is running. */
	registrationQuestions: SessionQuestion[];
	/** Wording to use in place of the guest's own, for a worker filling it in for them. */
	copy?: Partial<GuestFormCopy>;
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
	copy: override,
}: GuestLotteryFormProps) {
	const t = useTranslation();
	const copy = useGuestFormCopy(override);
	const { registration } = useRootStore();
	const { guest } = registration;
	const householdIssues = registration.household.issues;

	/** The household's issue with `count`, worded for whoever is filling the form in. */
	function errorFor(count: HouseholdCount): string | undefined {
		const { countErrors } = t.guestView.forms;
		const { min, max } = HouseholdComposition.ranges[count];

		switch (householdIssues[count]) {
			case undefined:
				return undefined;
			case 'required':
				return countErrors.required;
			case 'not-whole-number':
				return countErrors.notWholeNumber;
			case 'out-of-range':
				return countErrors.outOfRange.replace('{min}', String(min)).replace('{max}', String(max));
			case 'exceeds-household':
				return copy.exceedsHousehold;
			case 'no-adult':
				return copy.noAdult;
		}
	}

	const ageRangeLabels: Record<AgeRange, string> = {
		'0-17': t.ageRange0to17,
		'18-29': t.ageRange18to29,
		'30-44': t.ageRange30to44,
		'45-59': t.ageRange45to59,
		'60-74': t.ageRange60to74,
		'75+': t.ageRange75plus,
	};

	/** The three counts differ only in their label, hint, and range, so they share the rest. */
	const countProps = {
		required: true,
		decrementLabel: t.countDecrementLabel,
		incrementLabel: t.countIncrementLabel,
	};

	return (
		<>
			<FormSection legend={copy.lotteryLegend}>
				<TextField
					label={t.age}
					select
					slotProps={{ select: { native: true } }}
					value={guest.ageRange}
					onChange={(event) =>
						registration.updateGuest({ ageRange: event.target.value as AgeRange | '' })
					}
					required
				>
					<option value="" disabled>
						{copy.agePlaceholder}
					</option>
					{ageRanges.map((range) => (
						<option key={range} value={range}>
							{ageRangeLabels[range]}
						</option>
					))}
				</TextField>
				<NumberSpinner
					{...countProps}
					label={copy.household}
					hint={copy.householdHint}
					{...HouseholdComposition.ranges.householdSize}
					error={errorFor('householdSize')}
					value={guest.householdSize}
					onChange={(value) => registration.updateGuest({ householdSize: value })}
				/>
				<NumberSpinner
					{...countProps}
					label={copy.childrenCount}
					{...HouseholdComposition.ranges.childrenCount}
					error={errorFor('childrenCount')}
					value={guest.childrenCount}
					onChange={(value) => registration.updateGuest({ childrenCount: value })}
				/>
				<NumberSpinner
					{...countProps}
					label={copy.seniorsCount}
					hint={copy.seniorsHint}
					{...HouseholdComposition.ranges.seniorsCount}
					error={errorFor('seniorsCount')}
					value={guest.seniorsCount}
					onChange={(value) => registration.updateGuest({ seniorsCount: value })}
				/>
			</FormSection>
			{registrationQuestions.length > 0 ? (
				<FormSection legend={t.guestView.forms.questionsLegend}>
					{registrationQuestions.map((question) =>
						question.type === 'scale' ? (
							<TextField
								key={question.id}
								label={question.prompt}
								select
								slotProps={{ select: { native: true } }}
								value={registration.registrationAnswers[question.id] ?? ''}
								// Scale answers are sent to the API as numbers.
								onChange={(event) =>
									registration.setAnswer(question.id, Number(event.target.value))
								}
								required={question.required}
							>
								<option value="" disabled>
									{t.chooseAnswer}
								</option>
								{scaleValues.map((value) => (
									<option key={value} value={value}>
										{value}
									</option>
								))}
							</TextField>
						) : (
							<TextField
								key={question.id}
								label={question.prompt}
								multiline
								rows={3}
								value={registration.registrationAnswers[question.id] ?? ''}
								onChange={(event) => registration.setAnswer(question.id, event.target.value)}
								// Trimmed on the way out rather than on every keystroke: trimming as the
								// guest types would eat the space between words as soon as it was pressed.
								onBlur={(event) => registration.setAnswer(question.id, event.target.value.trim())}
								required={question.required}
							/>
						),
					)}
				</FormSection>
			) : null}
		</>
	);
});
