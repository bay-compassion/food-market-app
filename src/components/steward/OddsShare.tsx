import styled from '@emotion/styled';

import type { DrawTier } from '../../models/draw-simulation';
import { tierColor, tierLabel } from './temperature-styles';

const Rows = styled.div`
	display: grid;
	grid-template-columns: 60px minmax(0, 1fr);
	gap: 8px;
	align-items: center;
	color: var(--color-text-muted);
	font-size: 14px;
`;

const Stack = styled.div`
	display: flex;
	gap: 2px;
	height: 22px;
`;

const Key = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 6px 16px;
	color: var(--color-text-muted);
	font-size: 13px;

	span {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	i {
		width: 12px;
		height: 12px;
	}
`;

/** Share of people beside share of the odds, the quickest check that weighting hasn't grown. */
export function OddsShare({ tiers }: { tiers: readonly DrawTier[] }) {
	const people = tiers.reduce((sum, { entries }) => sum + entries, 0);
	const odds = tiers.reduce((sum, { entries, weight }) => sum + entries * weight, 0);

	return (
		<>
			<Rows>
				<span>People</span>
				<Stack>
					{tiers.map(({ weight, entries }) => (
						<div
							key={weight}
							style={{ width: `${(entries / people) * 100}%`, background: tierColor(weight) }}
						/>
					))}
				</Stack>
				<span>Odds</span>
				<Stack>
					{tiers.map(({ weight, entries }) => (
						<div
							key={weight}
							style={{
								width: `${((entries * weight) / odds) * 100}%`,
								background: tierColor(weight),
							}}
						/>
					))}
				</Stack>
			</Rows>
			<Key>
				{tiers.map(({ weight }) => (
					<span key={weight}>
						<i style={{ background: tierColor(weight) }} />
						{tierLabel(weight)}
					</span>
				))}
			</Key>
		</>
	);
}
