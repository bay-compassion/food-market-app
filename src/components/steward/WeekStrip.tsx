import styled from '@emotion/styled';

import type { WeekMark } from '../../models/steward-roster';

const Strip = styled.div<{ count: number }>`
	display: grid;
	grid-template-columns: repeat(${({ count }) => Math.max(count, 1)}, minmax(0, 1fr));
	gap: 3px;
`;

const marks: Record<WeekMark, { background: string; border: string }> = {
	won: { background: 'var(--color-brand)', border: '0' },
	missed: { background: 'transparent', border: '2px solid #2166ac' },
	none: { background: 'var(--color-surface-strong)', border: '0' },
};

const Mark = styled.div`
	height: 22px;
	box-sizing: border-box;
	border-radius: 3px;
`;

const Key = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 4px 14px;
	color: var(--color-text-muted);
	font-size: 12px;

	span {
		display: flex;
		align-items: center;
		gap: 5px;
	}

	i {
		width: 12px;
		height: 12px;
		box-sizing: border-box;
		border-radius: 3px;
	}
`;

/** One mark per Saturday, oldest first. */
export function WeekStrip({ weeks, label }: { weeks: readonly WeekMark[]; label: string }) {
	return (
		<Strip count={weeks.length} role="img" aria-label={label}>
			{weeks.map((week, index) => (
				<Mark key={index} style={marks[week]} />
			))}
		</Strip>
	);
}

export function WeekStripKey() {
	return (
		<Key>
			<span>
				<i style={marks.won} />
				Got a number
			</span>
			<span>
				<i style={marks.missed} />
				Missed
			</span>
			<span>
				<i style={marks.none} />
				Didn't enter
			</span>
		</Key>
	);
}
