import styled from '@emotion/styled';

import type { VisitStatusTranslations } from '@/locales.ts';

import { GuestVisitStatusPanel } from './GuestVisitStatusPanel';
import { QueuePositionDots } from './QueuePositionDots';

const QueueStanding = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16px;
	margin-bottom: 27px;
	padding: 24px 20px;
	border-radius: var(--radius-md);
	background: var(--color-surface-soft);
`;

const QueuePosition = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;

	span {
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.03em;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}

	strong {
		font-family: var(--font-heading);
		font-weight: 700;
		font-size: 76px;
		line-height: 1;
		color: var(--color-brand);
	}
`;

const GuestsAhead = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;
`;

const GuestsAheadCount = styled.div`
	display: inline-flex;
	align-items: baseline;
	gap: 8px;
	padding: 10px 18px;
	border: 1.5px solid color-mix(in srgb, var(--color-border) 45%, transparent);
	border-radius: var(--radius-lg);
	background: var(--color-background);

	strong {
		font-family: var(--font-heading);
		font-weight: 700;
		font-size: 26px;
		line-height: 1;
		color: var(--color-brand);
	}

	span {
		font-size: 14px;
		font-weight: 500;
		color: var(--color-text-muted);
	}
`;

const QueueNext = styled.p`
	font-weight: 700;
`;

export type WaitingVisitStatusProps = {
	copy: VisitStatusTranslations;
	queuePosition: number | null;
	guestsAhead: number | null;
};

export function WaitingVisitStatus({ copy, queuePosition, guestsAhead }: WaitingVisitStatusProps) {
	const queueDetails = queuePosition ? (
		<QueueStanding className="queue-standing">
			<QueuePosition className="queue-position">
				<span>{copy.waiting.queuePositionLabel}</span>
				<strong>{queuePosition}</strong>
			</QueuePosition>
			{guestsAhead === 0 ? (
				<QueueNext className="queue-next">{copy.waiting.youAreNext}</QueueNext>
			) : guestsAhead !== null ? (
				<GuestsAhead className="guests-ahead">
					{/* `guestsAhead` here is always at least 1 (the `=== 0` branch above claims that
					    case), and `linePosition` counts outward from the cart starting at 1 for the
					    pip right next to it — one slot further out than the number of guests ahead. */}
					<QueuePositionDots linePosition={guestsAhead + 1} />
					<GuestsAheadCount>
						<strong>{guestsAhead}</strong>
						<span>{copy.waiting.guestsAheadLabel}</span>
					</GuestsAheadCount>
				</GuestsAhead>
			) : null}
		</QueueStanding>
	) : null;

	return (
		<GuestVisitStatusPanel
			icon="✓"
			heading={copy.waiting.header}
			description={copy.waiting.details}
			details={queueDetails}
		/>
	);
}
