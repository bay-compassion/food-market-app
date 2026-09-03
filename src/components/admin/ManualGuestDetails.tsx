import { TextField } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { ageRanges, type AgeRange } from '../../services/ageRanges';
import { parseNumericInput } from '../../services/numericInput';
import { useTranslation } from '../../stores/react/use-translation';
import { PhoneField } from '../PhoneField';
import type { ManualGuest } from './types';

type ManualGuestDetailsProps = {
	guest: ManualGuest;
	onChange: (patch: Partial<ManualGuest>) => void;
};

/** Identity and household fields for the admin's locally edited guest. */
export const ManualGuestDetails = observer(function ManualGuestDetails({
	guest,
	onChange,
}: ManualGuestDetailsProps) {
	const base = useTranslation();

	const ageRangeLabels: Record<AgeRange, string> = {
		'0-17': base.ageRange0to17,
		'18-29': base.ageRange18to29,
		'30-44': base.ageRange30to44,
		'45-59': base.ageRange45to59,
		'60-74': base.ageRange60to74,
		'75+': base.ageRange75plus,
	};

	return (
		<>
			<TextField
				label={base.firstName}
				value={guest.firstName}
				onChange={(event) => onChange({ firstName: event.target.value.trim() })}
				required
			/>
			<TextField
				label={base.lastName}
				value={guest.lastName}
				onChange={(event) => onChange({ lastName: event.target.value.trim() })}
				required
			/>
			<div className="field-row">
				<TextField
					label={base.age}
					select
					slotProps={{ select: { native: true } }}
					value={guest.ageRange}
					onChange={(event) => onChange({ ageRange: event.target.value as AgeRange | '' })}
					required
				>
					<option value="" disabled>
						{base.agePlaceholder}
					</option>
					{ageRanges.map((range) => (
						<option key={range} value={range}>
							{ageRangeLabels[range]}
						</option>
					))}
				</TextField>
				<TextField
					label={base.household}
					type="number"
					slotProps={{ htmlInput: { min: 1, max: 30 } }}
					value={guest.householdSize}
					onChange={(event) => onChange({ householdSize: parseNumericInput(event.target.value) })}
					required
				/>
			</div>
			<div className="field-row">
				<TextField
					label={base.childrenCount}
					type="number"
					slotProps={{ htmlInput: { min: 0, max: 30 } }}
					value={guest.childrenCount}
					onChange={(event) => onChange({ childrenCount: parseNumericInput(event.target.value) })}
					required
				/>
				<TextField
					label={base.seniorsCount}
					type="number"
					slotProps={{ htmlInput: { min: 0, max: 30 } }}
					value={guest.seniorsCount}
					onChange={(event) => onChange({ seniorsCount: parseNumericInput(event.target.value) })}
					required
				/>
			</div>
			<PhoneField
				label={base.phone}
				value={guest.phone}
				onChange={(value) => onChange({ phone: value })}
				required
			/>
		</>
	);
});
