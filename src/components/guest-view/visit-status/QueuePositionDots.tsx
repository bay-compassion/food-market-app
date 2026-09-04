import styled from '@emotion/styled';

const maxVisibleDots = 8;

const Row = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 5px;
`;

const Dot = styled.span`
	width: 9px;
	height: 9px;
	border-radius: 50%;
	background: var(--color-border);
	opacity: 0.35;
`;

const YouDot = styled.span`
	width: 14px;
	height: 14px;
	margin-left: 3px;
	border-radius: 50%;
	background: var(--color-brand);
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-brand) 18%, transparent);
`;

const Overflow = styled.span`
	margin: 0 2px;
	font-size: 11px;
	font-weight: 600;
	color: var(--color-text-muted);
`;

/**
 * A decorative queue readout: one muted dot per guest ahead, capped at `maxVisibleDots` with an
 * overflow count, ending in a highlighted dot for the guest's own spot. The `aheadCount` number
 * itself carries the accessible information elsewhere on the panel — this is `aria-hidden`.
 */
export function QueuePositionDots({ aheadCount }: { aheadCount: number }) {
	const visible = Math.max(0, Math.min(aheadCount, maxVisibleDots));
	const overflow = Math.max(0, aheadCount - maxVisibleDots);

	return (
		<Row className="queue-position-dots" aria-hidden="true">
			{Array.from({ length: visible }, (_, index) => (
				<Dot key={index} />
			))}
			{overflow > 0 ? <Overflow>+{overflow}</Overflow> : null}
			<YouDot />
		</Row>
	);
}
