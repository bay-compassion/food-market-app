import styled from '@emotion/styled';

import type { VisitStatusTranslations } from '@/locales.ts';

import type { NowCalling } from '../../../models/now-calling';

const Row = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 14px 20px;
`;

const Label = styled.span`
	font-size: 13px;
	font-weight: 600;
	letter-spacing: 0.03em;
	text-transform: uppercase;
	color: var(--color-text-muted);
	text-align: start;
`;

/* A div, not a p: GuestVisitStatusPanel styles every paragraph inside it as muted body copy. */
const NoneCalled = styled.div`
	font-size: 15px;
	font-weight: 500;
	color: var(--color-text-muted);
	text-align: end;
`;

const Numbers = styled.div`
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-end;
	align-items: center;
	gap: 8px;
	color: var(--color-brand);
	font-family: var(--font-heading);
	font-weight: 700;
	line-height: 1;
	font-variant-numeric: tabular-nums;

	strong {
		font-size: 30px;
	}
`;

/** A priority number: outlined, so it reads as a line of its own rather than a skipped main number. */
const PriorityNumber = styled.span`
	padding: 3px 9px;
	border: 1.5px solid currentColor;
	border-radius: var(--radius-pill);
	font-size: 18px;
`;

export type NowCallingIndicatorProps = {
	copy: VisitStatusTranslations['waiting'];
	nowCalling: NowCalling;
};

/**
 * The "now calling" row under a waiting guest's number: the main number the market has reached,
 * for them to compare with their own, and any priority number being called beside it. A polite
 * live region, so a screen reader hears the numbers change as the queue refreshes without being
 * interrupted.
 */
export function NowCallingIndicator({ copy, nowCalling }: NowCallingIndicatorProps) {
	const { main, priority } = nowCalling;

	return (
		<Row className="now-calling" role="status" aria-live="polite">
			<Label>{copy.nowCallingLabel}</Label>
			{nowCalling.isEmpty ? (
				<NoneCalled>{copy.nowCallingNone}</NoneCalled>
			) : (
				<Numbers>
					{main ? <strong>{main.label}</strong> : null}
					{priority.map((number) => (
						<PriorityNumber key={number.label}>{number.label}</PriorityNumber>
					))}
				</Numbers>
			)}
		</Row>
	);
}
