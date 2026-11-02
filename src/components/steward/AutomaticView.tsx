import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useMemo, useState } from 'react';

import { DrawSimulation } from '../../models/draw-simulation';
import { tierEntries } from '../../models/steward-roster';
import { ChanceBars } from './ChanceBars';
import { percent, shortDate } from './format';
import { useSteward } from './steward-context';
import {
	Card,
	CardTitle,
	Chip,
	Columns,
	Lede,
	Note,
	Page,
	PageTitle,
	Stat,
	StatGrid,
	Table,
	TableFrame,
} from './steward.styles';
import { tierColor, tierLabel } from './temperature-styles';

const Off = styled.span`
	padding: 3px 12px;
	border-radius: var(--radius-pill);
	color: #fff;
	background: #5c655f;
	font-size: 13px;
	font-weight: 700;
`;

const Rule = styled.div`
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	gap: 12px;
	align-items: center;
`;

const topChoices = [3, 5];

export const AutomaticView = observer(function AutomaticView(): React.JSX.Element {
	const roster = useSteward().roster!;
	const [top, setTop] = useState(3);
	const { upcoming, draws } = roster.ledger;
	const source =
		upcoming && tierEntries(upcoming.suggestedTiers) > 0
			? { tiers: upcoming.suggestedTiers, spots: upcoming.spots, label: 'the next draw so far' }
			: draws.length > 0 && tierEntries(draws.at(-1)!.suggestedTiers) > 0
				? {
						tiers: draws.at(-1)!.suggestedTiers,
						spots: draws.at(-1)!.tiers.reduce((sum, tier) => sum + tier.placed, 0),
						label: 'the last draw',
					}
				: null;
	// The ledger records the rule at ×3. This shows the same people if its top step were different.
	const tiers = useMemo(
		() =>
			(source?.tiers ?? []).map((tier) => (tier.weight === 3 ? { ...tier, weight: top } : tier)),
		[source?.tiers, top],
	);
	const simulation = useMemo(
		() => new DrawSimulation(tiers, source?.spots ?? 0),
		[tiers, source?.spots],
	);
	const expected = useMemo(() => simulation.expectedPlaced(), [simulation]);
	const raised = tiers.filter(({ weight }) => weight > 1);
	const odds = tiers.reduce((sum, { entries, weight }) => sum + entries * weight, 0);
	const raisedOdds = raised.reduce((sum, { entries, weight }) => sum + entries * weight, 0);
	const entries = tierEntries(tiers);
	const recorded = useMemo(
		() =>
			[...draws]
				.reverse()
				.filter(({ suggestedTiers }) => tierEntries(suggestedTiers) > 0)
				.map(({ id, opensAt, tiers: actual, suggestedTiers }) => ({
					id,
					opensAt,
					wouldRaise: tierEntries(suggestedTiers.filter(({ weight }) => weight > 1)),
					moved: Math.round(
						new DrawSimulation(
							suggestedTiers,
							actual.reduce((sum, tier) => sum + tier.placed, 0),
						).placesMoved(),
					),
				})),
		[draws],
	);

	return (
		<Page>
			<header>
				<div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
					<PageTitle>Automatic Odds</PageTitle>
					<Off>Off · Preview Only</Off>
				</div>
				<Lede>
					No guest's odds change. Each Saturday the app records what this rule would have done, so
					you can judge it before anyone decides to use it.
				</Lede>
			</header>
			<Columns>
				<Card>
					<CardTitle>The Rule Being Tested</CardTitle>
					<Rule>
						<span>Missed 0 or 1 in a row</span>
						<strong>×1</strong>
						<span>Missed 2 or 3 in a row</span>
						<strong>×2</strong>
						<span>Missed 4 or more in a row</span>
						<div
							role="group"
							aria-label="Odds after 4 or more misses"
							style={{ display: 'flex', gap: 4 }}
						>
							{topChoices.map((choice) => (
								<Chip
									key={choice}
									type="button"
									selected={top === choice}
									aria-pressed={top === choice}
									onClick={() => setTop(choice)}
								>
									×{choice}
								</Chip>
							))}
						</div>
					</Rule>
					<Note>
						Getting a number starts the count over. It only ever raises odds, and a setting made by
						a steward always wins.
					</Note>
				</Card>
				<Card>
					<CardTitle>If It Had Run</CardTitle>
					{source ? (
						<>
							<StatGrid>
								<Stat>
									<strong>{Math.round(simulation.placesMoved(expected))}</strong>
									<span>Places Moved to Raised Guests</span>
								</Stat>
								<Stat>
									<strong>{percent(raisedOdds / odds)}</strong>
									<span>
										Of the Odds, Held by {percent(tierEntries(raised) / entries)} of People
									</span>
								</Stat>
							</StatGrid>
							<ChanceBars
								marker={simulation.evenChance}
								markerNote={`Using ${source.label}. The line marks even odds, ${percent(simulation.evenChance)}.`}
								bars={tiers.map(({ weight, entries: n }, index) => ({
									label: `${tierLabel(weight)} · ${n}`,
									share: (expected[index] ?? 0) / n,
									color: tierColor(weight),
								}))}
							/>
						</>
					) : (
						<Lede>Nothing to preview until someone enters a draw.</Lede>
					)}
				</Card>
			</Columns>
			<Card>
				<CardTitle>Recorded So Far</CardTitle>
				{recorded.length === 0 ? (
					<Lede>Recording starts with the next draw.</Lede>
				) : (
					<TableFrame>
						<Table>
							<thead>
								<tr>
									<th scope="col">Date</th>
									<th scope="col" className="number">
										Would Raise
									</th>
									<th scope="col" className="number">
										Places Moved
									</th>
								</tr>
							</thead>
							<tbody>
								{recorded.map(({ id, opensAt, wouldRaise, moved }) => (
									<tr key={id}>
										<th scope="row">{shortDate(opensAt)}</th>
										<td className="number">{wouldRaise}</td>
										<td className="number">
											<strong>{moved}</strong>
										</td>
									</tr>
								))}
							</tbody>
						</Table>
					</TableFrame>
				)}
				<Note>
					Turning this on is not available yet. It needs a decision on how the market wants to use
					its odds.
				</Note>
			</Card>
		</Page>
	);
});
