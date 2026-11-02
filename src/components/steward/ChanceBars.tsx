import styled from '@emotion/styled';

import { Note } from './steward.styles';

const Rows = styled.div`
	display: grid;
	grid-template-columns: minmax(96px, max-content) minmax(0, 1fr) 44px;
	gap: 10px 8px;
	align-items: center;
	font-size: 14px;

	strong {
		text-align: end;
	}
`;

const Track = styled.div`
	position: relative;
	height: 12px;
	border-radius: 3px;
	background: var(--color-surface-strong);

	.fill {
		height: 12px;
		border-radius: 3px;
	}

	.line {
		position: absolute;
		top: -4px;
		bottom: -4px;
		width: 2px;
		background: var(--color-text);
	}
`;

export type ChanceBar = { label: string; share: number; color: string; value?: string };

/** Horizontal meters against one marker line, which is what even odds would give. */
export function ChanceBars({
	bars,
	marker,
	markerNote,
}: {
	bars: ChanceBar[];
	marker: number;
	markerNote: string;
}) {
	return (
		<>
			<Rows>
				{bars.map(({ label, share, color, value }) => (
					<div key={label} style={{ display: 'contents' }}>
						<span>{label}</span>
						<Track>
							<div
								className="fill"
								style={{ width: `${Math.min(share, 1) * 100}%`, background: color }}
							/>
							<div className="line" style={{ insetInlineStart: `${Math.min(marker, 1) * 100}%` }} />
						</Track>
						<strong>{value ?? `${Math.round(share * 100)}%`}</strong>
					</div>
				))}
			</Rows>
			<Note>{markerNote}</Note>
		</>
	);
}
