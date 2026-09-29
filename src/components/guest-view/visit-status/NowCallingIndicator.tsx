import styled from '@emotion/styled';

import type { VisitStatusTranslations } from '@/locales.ts';

const Board = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	align-self: stretch;
	padding: 14px 20px;
	border-radius: var(--radius-md);
	background: var(--color-brand-dark);
	color: var(--color-on-brand);

	span {
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}

	strong {
		font-family: var(--font-heading);
		font-weight: 700;
		font-size: 44px;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	/* A div, not a p: GuestVisitStatusPanel styles every paragraph inside it as muted
	   body copy, which would vanish against this board. */
	div {
		font-size: 15px;
		font-weight: 500;
	}
`;

export type NowCallingIndicatorProps = {
	copy: VisitStatusTranslations['waiting'];
	/** The queue number most recently called, or `null` before anyone has been called. */
	nowCalling: number | null;
};

/**
 * The "now calling" board a DMV hangs over its counters: the number the market is serving right
 * now, so a waiting guest can compare it against their own place in line. A polite live region, so
 * a screen reader hears the number change as the queue refreshes without being interrupted.
 */
export function NowCallingIndicator({ copy, nowCalling }: NowCallingIndicatorProps) {
	return (
		<Board className="now-calling" role="status" aria-live="polite">
			<span>{copy.nowCallingLabel}</span>
			{nowCalling === null ? <div>{copy.nowCallingNone}</div> : <strong>{nowCalling}</strong>}
		</Board>
	);
}
