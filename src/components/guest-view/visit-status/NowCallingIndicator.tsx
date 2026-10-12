import styled from '@emotion/styled';

import type { VisitStatusTranslations } from '@/locales.ts';

import type { NowCalling } from '../../../models/now-calling';

const Row = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10px;
	padding: 16px 20px 18px;
`;

const Label = styled.span`
	font-size: 13px;
	font-weight: 600;
	letter-spacing: 0.03em;
	text-transform: uppercase;
	color: var(--color-text-muted);
`;

/* A div, not a p: GuestVisitStatusPanel styles every paragraph inside it as muted body copy. */
const NoneCalled = styled.div`
	font-size: 15px;
	font-weight: 500;
	color: var(--color-text-muted);
`;

const Numbers = styled.div`
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	align-items: center;
	gap: 8px;
	font-family: var(--font-heading);
	font-weight: 700;
	line-height: 1;
	font-variant-numeric: tabular-nums;
`;

const Tile = styled.span`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 52px;
	box-sizing: border-box;
	padding: 7px 12px;
	border-radius: 12px;
`;

/** The number the market has reached: the one to compare with your own. */
const Latest = styled(Tile)`
	background: var(--color-brand);
	color: var(--color-on-brand);
	font-size: 30px;
`;

/** Called before it and still expected at the entrance — the rest of a batch, or a late arrival. */
const Earlier = styled(Tile)`
	border: 1.5px solid color-mix(in srgb, var(--color-border) 45%, transparent);
	background: var(--color-background);
	color: var(--color-brand);
	font-size: 24px;
`;

/** A priority number: a pill, so it reads as a line of its own rather than a skipped main number. */
const Priority = styled.span`
	padding: 7px 12px;
	border: 2px solid var(--color-brand);
	border-radius: var(--radius-pill);
	color: var(--color-brand);
	font-size: 22px;
`;

export type NowCallingIndicatorProps = {
	copy: VisitStatusTranslations['waiting'];
	nowCalling: NowCalling;
};

/**
 * The "now calling" row under a waiting guest's number — the room display in miniature. The main
 * number the market has reached is filled, for the guest to compare with their own; numbers called
 * before it that are still expected at the entrance sit outlined beside it, which is how a batch
 * called at once reads; a priority number being called is a pill after them.
 *
 * A polite live region, so a screen reader hears the numbers change as the queue refreshes without
 * being interrupted.
 */
export function NowCallingIndicator({ copy, nowCalling }: NowCallingIndicatorProps) {
	const { main, earlier, priority } = nowCalling;

	return (
		<Row className="now-calling" role="status" aria-live="polite">
			<Label>{copy.nowCallingLabel}</Label>
			{nowCalling.isEmpty ? (
				<NoneCalled>{copy.nowCallingNone}</NoneCalled>
			) : (
				<Numbers>
					{earlier.map((number) => (
						<Earlier key={number.label}>{number.label}</Earlier>
					))}
					{main ? <Latest>{main.label}</Latest> : null}
					{priority.map((number) => (
						<Priority key={number.label}>{number.label}</Priority>
					))}
				</Numbers>
			)}
		</Row>
	);
}
