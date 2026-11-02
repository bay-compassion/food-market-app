import { observer } from 'mobx-react-lite';
import { useMemo } from 'react';

import { DrawSimulation } from '../../models/draw-simulation';
import { tierEntries } from '../../models/steward-roster';
import type { StewardDraw } from '../../services/steward-api';
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
	PageTitle,
	Table,
	TableFrame,
} from './steward.styles';
import { temperatureStyles, tierLabel } from './temperature-styles';

export const LastDrawPanel = observer(function LastDrawPanel({ draw }: { draw: StewardDraw }) {
	const roster = useSteward().roster!;
	const placed = draw.tiers.map((tier) => tier.placed);
	const total = placed.reduce((sum, count) => sum + count, 0);
	const entries = tierEntries(draw.tiers);
	const simulation = useMemo(() => new DrawSimulation(draw.tiers, total), [draw.tiers, total]);
	const expected = useMemo(() => simulation.expectedPlaced(), [simulation]);
	const misses = roster.missesByTemperature(draw.id).filter((tally) => tally.entries > 0);
	const recent = [...roster.ledger.draws].reverse();

	return (
		<>
			<header>
				<Eyebrow>{shortDate(draw.opensAt)}</Eyebrow>
				<PageTitle>
					{total} Got a Number, {entries - total} Missed
				</PageTitle>
				<Lede>
					{simulation.withinLuck(placed, expected)
						? 'Every tier landed within what luck would produce.'
						: 'A tier landed further from expected than luck usually does. One Saturday still says little.'}
				</Lede>
			</header>
			<Columns>
				<Card>
					<CardTitle>Expected and Actual</CardTitle>
					<TableFrame>
						<Table>
							<thead>
								<tr>
									<th scope="col">Tier</th>
									<th scope="col" className="number">
										Entered
									</th>
									<th scope="col" className="number">
										Expected
									</th>
									<th scope="col" className="number">
										Actual
									</th>
								</tr>
							</thead>
							<tbody>
								{draw.tiers.map(({ weight, entries: n, placed: actual }, index) => (
									<tr key={weight}>
										<th scope="row">{tierLabel(weight)}</th>
										<td className="number">{n}</td>
										<td className="number">{Math.round(expected[index] ?? 0)}</td>
										<td className="number">
											<strong>{actual}</strong>
										</td>
									</tr>
								))}
							</tbody>
						</Table>
					</TableFrame>
					<Note>
						Raised tiers are small, so one Saturday tells you little. Read them over several.
					</Note>
				</Card>
				<Card>
					<CardTitle>Who Missed</CardTitle>
					<ChanceBars
						marker={1 - total / entries}
						markerNote={`By each guest's temperature going into this draw. The line marks everyone, ${percent(1 - total / entries)}. Small groups swing a lot.`}
						bars={misses.map(({ level, missed, entries: n }) => ({
							label: temperatureStyles[level].label,
							share: missed / n,
							color:
								level === 'new' ? 'var(--color-border-soft)' : temperatureStyles[level].background,
							value: `${missed}/${n}`,
						}))}
					/>
				</Card>
			</Columns>
			<Card>
				<CardTitle>Recent Saturdays</CardTitle>
				<TableFrame>
					<Table>
						<thead>
							<tr>
								<th scope="col">Date</th>
								<th scope="col" className="number">
									Entered
								</th>
								<th scope="col" className="number">
									Got a Number
								</th>
								<th scope="col" className="number">
									Share
								</th>
								<th scope="col" className="number">
									Raised
								</th>
							</tr>
						</thead>
						<tbody>
							{recent.map(({ id, opensAt, tiers }) => {
								const n = tierEntries(tiers);
								const got = tiers.reduce((sum, tier) => sum + tier.placed, 0);
								const raised = tierEntries(tiers.filter(({ weight }) => weight > 1));

								return (
									<tr key={id}>
										<th scope="row">{shortDate(opensAt)}</th>
										<td className="number">{n}</td>
										<td className="number">{got}</td>
										<td className="number">{n === 0 ? '—' : percent(got / n)}</td>
										<td className="number">{raised}</td>
									</tr>
								);
							})}
						</tbody>
					</Table>
				</TableFrame>
			</Card>
		</>
	);
});
