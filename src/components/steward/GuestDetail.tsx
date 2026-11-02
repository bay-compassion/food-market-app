import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

import type { TemperatureLevel } from '../../models/guest-temperature';
import { AdjustOddsDialog } from './AdjustOddsDialog';
import { shortDate } from './format';
import { useSteward } from './steward-context';
import { Card, CardTitle, Note, PillButton } from './steward.styles';
import { temperatureStyles, tierLabel } from './temperature-styles';
import { WeekStrip, WeekStripKey } from './WeekStrip';

const Banner = styled.div`
	padding: 14px;
	border: 1px solid;
	border-radius: var(--radius-md);

	strong {
		display: block;
		font-family: var(--font-heading);
		font-size: 22px;
		line-height: 1.1;
	}

	span {
		font-size: 14px;
	}
`;

const Odds = styled.div`
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding-top: 14px;
	border-top: 1px solid var(--color-divider);

	strong {
		font-size: 20px;
	}
`;

const Adjust = styled(PillButton)`
	border: 0;
	color: var(--color-on-brand);
	background: var(--color-brand);
`;

const scopeText = { next: 'This Saturday only', weeks: 'Standing', open: 'Until changed' };

function explain(level: TemperatureLevel, draws: number, numbers: number, expected: number) {
	return level === 'new'
		? `Only ${draws} ${draws === 1 ? 'draw' : 'draws'} so far, too few to say.`
		: `Got a number in ${numbers} of ${draws} draws. Even odds would give about ${Math.round(expected)}.`;
}

export const GuestDetail = observer(function GuestDetail() {
	const steward = useSteward();
	const person = steward.selected;
	const [adjusting, setAdjusting] = useState(false);

	if (!person) {
		return (
			<Card>
				<Note>Pick a guest to see their draws and odds.</Note>
			</Card>
		);
	}

	const { record, temperature, weight, person: facts } = person;
	const { background, color, border, label } = temperatureStyles[temperature];
	const { setting } = facts;
	const weeks = person.weeks;
	const won = weeks.filter((week) => week === 'won').length;
	const missed = weeks.filter((week) => week === 'missed').length;

	return (
		<Card aria-label="Selected guest">
			<button
				type="button"
				onClick={() => steward.select(null)}
				style={{
					alignSelf: 'flex-start',
					minHeight: 44,
					padding: 0,
					border: 0,
					color: 'var(--color-brand)',
					background: 'transparent',
					font: 'inherit',
					fontWeight: 700,
					cursor: 'pointer',
				}}
			>
				Close
			</button>
			<div>
				<CardTitle>{person.name}</CardTitle>
				<Note>
					Phone ending {facts.phoneLast4}
					{facts.householdSize === null ? '' : ` · Household ${facts.householdSize}`}
				</Note>
			</div>
			<Banner style={{ background, color, borderColor: border }}>
				<strong>{label}</strong>
				<span>{explain(temperature, record.draws, record.numbers, record.expectedNumbers)}</span>
			</Banner>
			<WeekStrip
				weeks={weeks}
				label={`${won} numbers and ${missed} misses across the last ${weeks.length} Saturdays.`}
			/>
			<WeekStripKey />
			<Odds>
				<CardTitle as="h3">Odds in the Draw</CardTitle>
				<strong>{tierLabel(weight)}</strong>
				<Note>
					{setting
						? `${setting.endsAt ? `Until ${shortDate(setting.endsAt)}` : scopeText[setting.scope]} · ${setting.actorName ?? 'Unnamed steward'} · ${setting.reason}`
						: 'No adjustments'}
				</Note>
				{steward.canManage ? (
					<Adjust type="button" onClick={() => setAdjusting(true)}>
						Adjust Odds
					</Adjust>
				) : null}
				<Note>Automatic Odds is off. It would suggest ×{person.suggestedWeight} here.</Note>
				{facts.records > 1 ? (
					<Note>{facts.records} records combined, matched by phone and name.</Note>
				) : null}
			</Odds>
			{adjusting ? <AdjustOddsDialog person={person} onClose={() => setAdjusting(false)} /> : null}
		</Card>
	);
});
