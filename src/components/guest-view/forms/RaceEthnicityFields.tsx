import styled from '@emotion/styled';
import { Checkbox, FormControlLabel, TextField } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useId } from 'react';

import {
	RaceEthnicity,
	federalRaceEthnicityCategories,
	type RaceEthnicityCode,
} from '../../../models/race-ethnicity';
import { useRootStore } from '../../../stores/react/store-context';
import { useTranslation } from '../../../stores/react/use-translation';

const Group = styled.fieldset`
	min-inline-size: 0;
	display: grid;
	gap: 2px;
	margin: 0;
	padding: 0;
	border: 0;

	legend {
		margin-bottom: 4px;
		padding: 0;
		color: var(--color-text);
		font-size: 17px;
		font-weight: 700;
		line-height: 1.35;
	}
`;

const Help = styled.p`
	margin: 0 0 6px;
	color: var(--color-text-muted);
	font-size: 14px;
	line-height: 1.4;
`;

/** Sets "Prefer not to answer" apart, since ticking it clears every other choice. */
const Separator = styled.hr`
	width: 100%;
	margin: 6px 0;
	border: 0;
	border-top: 1px solid var(--color-border-soft);
`;

/** Indents the self-description under its checkbox; padding, so the field's full width fits. */
const OtherText = styled.div`
	display: grid;
	margin: 2px 0 8px;
	padding-inline-start: 32px;
`;

/**
 * How the guest describes themselves, in the federal SPD 15 categories. Optional: nothing here is
 * `required` except the self-description once "Some other race and/or ethnicity" is ticked. Shown
 * only until the guest's record holds an answer.
 */
export const RaceEthnicityFields = observer(function RaceEthnicityFields() {
	const t = useTranslation();
	const { registration } = useRootStore();
	const entry = registration.raceEthnicity;
	const strings = t.guestView.forms.raceEthnicity;
	const helpId = useId();

	const option = (code: RaceEthnicityCode) => (
		<FormControlLabel
			key={code}
			control={<Checkbox checked={entry.value.has(code)} onChange={() => entry.toggle(code)} />}
			label={strings.options[code]}
		/>
	);

	return (
		// Blocked from session replays: the boxes' fixed order shows the answer even with text masked.
		<Group className="race-ethnicity" aria-describedby={helpId} data-sentry-block>
			<legend>{strings.legend}</legend>
			<Help id={helpId}>
				{strings.instruction} {strings.privacy}
			</Help>
			{federalRaceEthnicityCategories.map(option)}
			{option('another')}
			{entry.value.has('another') ? (
				<OtherText>
					<TextField
						label={strings.otherLabel}
						value={entry.value.otherTextInput}
						onChange={(event) => entry.setOtherText(event.target.value)}
						required
						slotProps={{ htmlInput: { maxLength: RaceEthnicity.otherTextMaxLength } }}
					/>
				</OtherText>
			) : null}
			<Separator />
			{option('prefer_not_to_answer')}
		</Group>
	);
});
