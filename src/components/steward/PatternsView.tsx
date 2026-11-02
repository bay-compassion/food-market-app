import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { ChanceBars } from './ChanceBars';
import { percent, shortDate } from './format';
import { useSteward } from './steward-context';
import {
	Card,
	CardTitle,
	Columns,
	Eyebrow,
	Lede,
	Note,
	Page,
	PageTitle,
	Stat,
	StatGrid,
	TableFrame,
} from './steward.styles';
import { WeekStrip, WeekStripKey } from './WeekStrip';

const Grid = styled.div`
	display: grid;
	grid-template-columns: 170px minmax(280px, 1fr) 70px;
	gap: 10px 12px;
	align-items: center;
	min-width: 520px;
	font-size: 14px;

	.head {
		color: var(--color-text-subtle);
		font-size: 12px;
		font-weight: 500;
	}

	.range {
		display: flex;
		justify-content: space-between;
	}

	.end {
		text-align: end;
	}
`;

export const PatternsView = observer(function PatternsView(): React.JSX.Element {
	const roster = useSteward().roster!;
	const { draws } = roster.ledger;
	const streaks = roster.streakBands;
	const tallest = Math.max(1, ...streaks.flatMap(({ people, expected }) => [people, expected]));
	const entered = roster.entered.length;

	if (entered === 0) {
		return (
			<Page>
				<PageTitle>Patterns</PageTitle>
				<Lede>Patterns appear once a draw has run.</Lede>
			</Page>
		);
	}

	return (
		<Page>
			<header>
				<Eyebrow>Last {draws.length} Saturdays · People, not records</Eyebrow>
				<PageTitle>{entered} People Entered the Draw</PageTitle>
			</header>
			<StatGrid>
				<Stat>
					<strong>{percent(roster.missedShare)}</strong>
					<span>Of Entries Missed</span>
				</Stat>
				<Stat>
					<strong>{roster.neverPlaced}</strong>
					<span>No Number After 3+ Draws</span>
				</Stat>
				<Stat>
					<strong>{roster.frequentEntrants}</strong>
					<span>Enter 8 or More Draws</span>
				</Stat>
			</StatGrid>
			<Columns>
				<Card>
					<CardTitle>Missed in a Row, Right Now</CardTitle>
					{streaks.map(({ label, people, expected }) => (
						<ChanceBarsRow
							key={label}
							label={label}
							people={people}
							expected={expected}
							tallest={tallest}
						/>
					))}
					<Note>People by current streak. The line marks what luck alone would produce.</Note>
				</Card>
				<Card>
					<CardTitle>How Often People Come, and How Often They Miss</CardTitle>
					<ChanceBars
						marker={roster.missedShare}
						markerNote={`The line marks everyone, ${percent(roster.missedShare)}. A band far past it, Saturday after Saturday, would be worth a closer look.`}
						bars={roster.frequencyBands.map(({ label, people, missedShare }) => ({
							label: `${label} draws · ${people}`,
							share: missedShare,
							color: '#7ebdc5',
						}))}
					/>
				</Card>
			</Columns>
			<Card>
				<CardTitle>Longest Shut Out</CardTitle>
				<WeekStripKey />
				<TableFrame>
					<Grid>
						<span className="head">Guest</span>
						<span className="head range">
							<span>{draws[0] ? shortDate(draws[0].opensAt) : ''}</span>
							<span>{draws.at(-1) ? shortDate(draws.at(-1)!.opensAt) : ''}</span>
						</span>
						<span className="head end">Numbers</span>
						{roster.longestShutOut.map(({ id, name, weeks, record }) => (
							<div key={id} style={{ display: 'contents' }}>
								<span>{name}</span>
								<WeekStrip
									weeks={weeks}
									label={`${name} got a number in ${record.numbers} of ${record.draws} draws.`}
								/>
								<span className="end">
									{record.numbers} of {record.draws}
								</span>
							</div>
						))}
					</Grid>
				</TableFrame>
			</Card>
		</Page>
	);
});

function ChanceBarsRow({
	label,
	people,
	expected,
	tallest,
}: {
	label: string;
	people: number;
	expected: number;
	tallest: number;
}) {
	return (
		<div
			style={{
				display: 'grid',
				gridTemplateColumns: '28px minmax(0, 1fr) 40px',
				gap: 8,
				alignItems: 'center',
				fontSize: 14,
			}}
		>
			<span>{label}</span>
			<div
				style={{
					position: 'relative',
					height: 18,
					borderRadius: 3,
					background: 'var(--color-surface-strong)',
				}}
			>
				<div style={{ width: `${(people / tallest) * 100}%`, height: 18, background: '#7ebdc5' }} />
				<div
					style={{
						position: 'absolute',
						insetInlineStart: `${(expected / tallest) * 100}%`,
						top: -2,
						bottom: -2,
						width: 2,
						background: 'var(--color-text)',
					}}
				/>
			</div>
			<strong style={{ textAlign: 'end' }}>{people}</strong>
		</div>
	);
}
