import styled from '@emotion/styled';
import { useMemo, useState } from 'react';

import { DrawSimulation, type DrawTier } from '../../models/draw-simulation';
import { ChanceBars } from './ChanceBars';
import { percent } from './format';
import { Card, CardRow, CardTitle, Columns, Lede, Note, PillButton } from './steward.styles';
import { tierColor, tierLabel } from './temperature-styles';

const Dots = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 3px;
	margin-bottom: 8px;

	i {
		width: 9px;
		height: 9px;
		box-sizing: border-box;
		border: 1px solid var(--color-border);
		border-radius: 50%;
	}
`;

const Spots = styled.label`
	display: flex;
	flex-direction: column;
	gap: 6px;
	font-size: 14px;
	font-weight: 500;

	span {
		display: flex;
		justify-content: space-between;
	}

	input {
		width: 100%;
		accent-color: var(--color-brand);
	}
`;

/** A what-if on tier sizes alone. Nothing here reaches the server, or could predict the real draw. */
export function RehearsalCard({
	tiers,
	initialSpots,
}: {
	tiers: readonly DrawTier[];
	initialSpots: number;
}) {
	const entries = tiers.reduce((sum, tier) => sum + tier.entries, 0);
	const [spots, setSpots] = useState(initialSpots);
	const [run, setRun] = useState(0);
	const simulation = useMemo(() => new DrawSimulation(tiers, spots), [tiers, spots]);
	const expected = useMemo(() => simulation.expectedPlaced(), [simulation]);
	// `run` is what redraws the dots.
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const placed = useMemo(() => simulation.draw(), [simulation, run]);
	const everyone = spots >= entries;

	return (
		<Card>
			<CardRow>
				<div>
					<CardTitle>Rehearse a Draw</CardTitle>
					<Lede>This changes nothing, and it can't predict the real draw.</Lede>
				</div>
				<PillButton type="button" onClick={() => setRun((current) => current + 1)}>
					Draw Again
				</PillButton>
			</CardRow>
			<Columns>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
					<Spots>
						<span>
							Spots <strong>{spots}</strong>
						</span>
						<input
							type="range"
							min={0}
							max={Math.max(entries, initialSpots)}
							value={spots}
							onChange={(event) => setSpots(Number(event.target.value))}
						/>
					</Spots>
					<ChanceBars
						marker={simulation.evenChance}
						markerNote={
							everyone
								? 'Everyone gets a number, so weights change nothing but line order.'
								: `Weighting would move about ${Math.round(simulation.placesMoved(expected))} places. The line marks even odds, ${percent(simulation.evenChance)}.`
						}
						bars={tiers.map(({ weight, entries: n }, index) => ({
							label: `${tierLabel(weight)} · ${n}`,
							share: n === 0 ? 0 : (expected[index] ?? 0) / n,
							color: tierColor(weight),
						}))}
					/>
				</div>
				<div>
					{tiers.map(({ weight, entries: n }, index) => (
						<div key={weight}>
							<Note>
								{tierLabel(weight)}: {placed[index]} of {n}
							</Note>
							<Dots role="img" aria-label={`${placed[index]} of ${n} got a number.`}>
								{Array.from({ length: n }, (_, dot) => (
									<i
										key={dot}
										style={
											dot < (placed[index] ?? 0)
												? { background: tierColor(weight), borderColor: tierColor(weight) }
												: undefined
										}
									/>
								))}
							</Dots>
						</div>
					))}
					<Note>Filled dots got a number.</Note>
				</div>
			</Columns>
		</Card>
	);
}
