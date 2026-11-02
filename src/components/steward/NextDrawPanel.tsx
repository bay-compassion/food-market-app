import { observer } from 'mobx-react-lite';
import { useMemo } from 'react';

import { DrawSimulation } from '../../models/draw-simulation';
import { tierEntries } from '../../models/steward-roster';
import { ChanceBars } from './ChanceBars';
import { percent, shortDate } from './format';
import { OddsShare } from './OddsShare';
import { RehearsalCard } from './RehearsalCard';
import { useSteward } from './steward-context';
import {
	Card,
	CardTitle,
	Columns,
	Eyebrow,
	Lede,
	PageTitle,
	Stat,
	StatGrid,
	Table,
	TableFrame,
} from './steward.styles';
import { tierColor, tierLabel } from './temperature-styles';
import { TemperatureBar } from './TemperatureBar';
import { TemperaturePill } from './TemperaturePill';

export const NextDrawPanel = observer(function NextDrawPanel() {
	const steward = useSteward();
	const roster = steward.roster!;
	const upcoming = roster.ledger.upcoming!;
	const { tiers, spots } = upcoming;
	const simulation = useMemo(() => new DrawSimulation(tiers, spots), [tiers, spots]);
	const expected = useMemo(() => simulation.expectedPlaced(), [simulation]);
	const entries = tierEntries(tiers);
	const moved = Math.round(simulation.placesMoved(expected));
	const raised = tiers.filter(({ weight }) => weight > 1);
	const raisedPeople = tierEntries(raised);
	const odds = tiers.reduce((sum, { entries: n, weight }) => sum + n * weight, 0);
	const raisedOdds = raised.reduce((sum, { entries: n, weight }) => sum + n * weight, 0);
	const standard = tiers.findIndex(({ weight }) => weight === 1);
	const standardChance = standard === -1 ? 0 : (expected[standard] ?? 0) / tiers[standard]!.entries;

	return (
		<>
			<header>
				<Eyebrow>{shortDate(upcoming.opensAt)} · Pool so far</Eyebrow>
				<PageTitle>
					{entries} in the Draw, {spots} Spots
				</PageTitle>
				<Lede>
					Weighting moves about {moved} places to raised guests. Standard guests go from{' '}
					{percent(simulation.evenChance)} to {percent(standardChance)}.
				</Lede>
			</header>
			<StatGrid>
				<Stat>
					<strong>{percent(simulation.evenChance)}</strong>
					<span>Chance With Even Odds</span>
				</Stat>
				<Stat>
					<strong>{percent(standardChance)}</strong>
					<span>Chance for Standard Guests</span>
				</Stat>
				<Stat>
					<strong>{moved}</strong>
					<span>Places Moved to Raised Guests</span>
				</Stat>
				<Stat>
					<strong>{raisedPeople}</strong>
					<span>Raised Guests, {percent(raisedPeople / entries)} of the Pool</span>
				</Stat>
				<Stat>
					<strong>{percent(raisedOdds / odds)}</strong>
					<span>Of the Odds, Held by Raised Guests</span>
				</Stat>
			</StatGrid>
			<Columns>
				<Card>
					<CardTitle>Who Holds the Odds</CardTitle>
					<OddsShare tiers={tiers} />
					<CardTitle>Chance of a Number</CardTitle>
					<ChanceBars
						marker={simulation.evenChance}
						markerNote={`The line marks even odds, ${percent(simulation.evenChance)}.`}
						bars={tiers.map(({ weight, entries: n }, index) => ({
							label: `${tierLabel(weight)} · ${n}`,
							share: (expected[index] ?? 0) / n,
							color: tierColor(weight),
						}))}
					/>
					<CardTitle>Temperature of This Pool</CardTitle>
					<TemperatureBar counts={roster.upcomingTemperatureCounts} />
				</Card>
				<Card>
					<CardTitle>Raised Guests</CardTitle>
					{roster.raisedEntrants.length === 0 ? (
						<Lede>Nobody in this pool holds raised odds.</Lede>
					) : (
						<TableFrame>
							<Table>
								<thead>
									<tr>
										<th scope="col">Guest</th>
										<th scope="col">Temperature</th>
										<th scope="col">Odds</th>
										<th scope="col">Set By</th>
									</tr>
								</thead>
								<tbody>
									{roster.raisedEntrants.map((person) => (
										<tr key={person.id}>
											<th scope="row">{person.name}</th>
											<td>
												<TemperaturePill level={person.temperature} />
											</td>
											<td>×{person.weight}</td>
											<td>{person.person.setting?.actorName ?? 'Added by hand'}</td>
										</tr>
									))}
								</tbody>
							</Table>
						</TableFrame>
					)}
				</Card>
			</Columns>
			<RehearsalCard tiers={tiers} initialSpots={spots} />
		</>
	);
});
