import { TextField } from '@mui/material';
import { observer } from 'mobx-react-lite';

import type { GuestFormCopy } from '../../../locales';
import { HouseholdComposition, type HouseholdCount } from '../../../models/household-composition';
import { ageRanges, type AgeRange } from '../../../services/ageRanges';
import { useTranslation } from '../../../stores/react/use-translation';
import type { HouseholdFormValues } from '../../../stores/registration.store';
import { NumberSpinner } from '../../NumberSpinner';
import { useAgeRangeLabels } from './use-age-range-labels';
import { useGuestFormCopy } from './use-guest-form-copy';

type HouseholdFieldsProps = {
	values: HouseholdFormValues;
	onChange: (patch: Partial<HouseholdFormValues>) => void;
	/** Wording to use in place of the guest's own, for a worker filling it in for them. */
	copy?: Partial<GuestFormCopy>;
};

/**
 * The guest's age range and who they are shopping for. The form edits its own fields with these;
 * a returning guest changing their saved household edits a draft with them instead.
 */
export const HouseholdFields = observer(function HouseholdFields({
	values,
	onChange,
	copy: override,
}: HouseholdFieldsProps) {
	const t = useTranslation();
	const copy = useGuestFormCopy(override);
	const ageRangeLabels = useAgeRangeLabels();
	const issues = new HouseholdComposition(values).issues;

	/** The household's issue with `count`, worded for whoever is filling the form in. */
	function errorFor(count: HouseholdCount): string | undefined {
		const { countErrors } = t.guestView.forms;
		const { min, max } = HouseholdComposition.ranges[count];

		switch (issues[count]) {
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

	/** The three counts differ only in their label, hint, and range, so they share the rest. */
	const countProps = {
		required: true,
		decrementLabel: t.countDecrementLabel,
		incrementLabel: t.countIncrementLabel,
	};

	return (
		<>
			<TextField
				label={t.age}
				select
				slotProps={{ select: { native: true } }}
				value={values.ageRange}
				onChange={(event) => onChange({ ageRange: event.target.value as AgeRange | '' })}
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
				value={values.householdSize}
				onChange={(value) => onChange({ householdSize: value })}
			/>
			<NumberSpinner
				{...countProps}
				label={copy.childrenCount}
				{...HouseholdComposition.ranges.childrenCount}
				error={errorFor('childrenCount')}
				value={values.childrenCount}
				onChange={(value) => onChange({ childrenCount: value })}
			/>
			<NumberSpinner
				{...countProps}
				label={copy.seniorsCount}
				hint={copy.seniorsHint}
				{...HouseholdComposition.ranges.seniorsCount}
				error={errorFor('seniorsCount')}
				value={values.seniorsCount}
				onChange={(value) => onChange({ seniorsCount: value })}
			/>
		</>
	);
});
