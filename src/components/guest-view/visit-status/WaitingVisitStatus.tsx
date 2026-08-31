import styled from '@emotion/styled';
import type { ReactNode } from 'react';

import type { VisitStatusTranslations } from '@/locales.ts';

import { GuestVisitStatusPanel } from './GuestVisitStatusPanel';

const QueueStanding = styled.div`
	margin-bottom: 27px;
	padding: 18px;
	border-radius: var(--radius-md);
	background: var(--color-surface-soft);

	p {
		margin-bottom: 0;
	}
`;

const QueuePosition = styled.p`
	display: grid;
	gap: 4px;
	margin-bottom: 8px;

	strong {
		font-family: var(--font-heading);
		font-size: 44px;
		line-height: 1;
		color: var(--color-brand);
	}
`;

const QueueNext = styled.p`
	font-weight: 700;
`;

export type WaitingVisitStatusProps = {
	copy: VisitStatusTranslations;
	queuePosition: number | null;
	guestsAhead: number | null;
	footer?: ReactNode;
};

export function WaitingVisitStatus({
	copy,
	queuePosition,
	guestsAhead,
	footer,
}: WaitingVisitStatusProps) {
	const queueDetails = queuePosition ? (
		<QueueStanding className="queue-standing">
			<QueuePosition className="queue-position">
				<span>{copy.waiting.queuePositionLabel}</span>
				<strong>{queuePosition}</strong>
			</QueuePosition>
			{guestsAhead === 0 ? (
				<QueueNext className="queue-next">{copy.waiting.youAreNext}</QueueNext>
			) : guestsAhead !== null ? (
				<p>
					{copy.waiting.guestsAheadLabel}: <strong>{guestsAhead}</strong>
				</p>
			) : null}
		</QueueStanding>
	) : (
		<p>
			{copy.currentStatusLabel}: <strong>{copy.labels.waiting}</strong>
		</p>
	);

	return (
		<GuestVisitStatusPanel
			icon="✓"
			heading={copy.waiting.header}
			description={copy.waiting.details}
			details={queueDetails}
			footer={footer}
		/>
	);
}
