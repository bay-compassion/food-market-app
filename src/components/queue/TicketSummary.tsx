import styled from '@emotion/styled';

import { adminTranslations } from '../../adminLocales';
import type { QueueGuest } from '../../services/admin-api';
import type { VisitStatus } from '../../services/visitStateMachine';
import { useNow } from '../hooks/use-now';

export type TicketSummaryProps = {
	guest: QueueGuest;
	statusLabel: string;
};

const Card = styled.section`
	overflow: hidden;
	border-radius: var(--radius-lg);
	background: var(--color-surface-soft);

	.ticket {
		padding: 14px 18px 10px;
	}

	.label {
		margin: 0;
		color: var(--color-text-subtle);
		font-size: 13px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.number {
		margin: 0;
		color: var(--color-brand);
		font-family: var(--font-heading);
		font-size: 44px;
		font-weight: 700;
		line-height: 1.1;
	}

	.status {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		margin: 0;
		padding: 10px 18px;
		border-top: 1px solid var(--color-border);
		font-size: 15px;
		font-weight: 700;
	}

	.status::before {
		content: '';
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: currentColor;
	}

	.status-label {
		flex: 1;
	}

	.timer {
		font-variant-numeric: tabular-nums;
	}

	&[data-status='called'] .status {
		color: var(--color-success);
	}

	&[data-status='waiting'] .status {
		color: var(--color-brand);
	}

	&[data-status='no_show'] .status,
	&[data-status='cancelled'] .status {
		color: var(--color-warning);
	}
`;

/** `11h 5m 8s`, dropping leading units that are zero. */
function formatElapsed(milliseconds: number): string {
	const total = Math.max(0, Math.floor(milliseconds / 1_000));
	const hours = Math.floor(total / 3_600);
	const minutes = Math.floor((total % 3_600) / 60);
	const seconds = total % 60;

	if (hours) {
		return `${hours}h ${minutes}m ${seconds}s`;
	}

	return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

/** The statuses whose clock is still running: a called guest the volunteer is waiting on. */
const timedStatuses: VisitStatus[] = ['called'];

/**
 * The head of an open ticket: its number, where it stands, and — while the guest is on their way
 * to the table — a clock counting up from the moment they were called.
 */
export function TicketSummary({ guest, statusLabel }: TicketSummaryProps) {
	const t = adminTranslations.en.queueDesk;
	const now = useNow(1_000);
	const elapsed =
		timedStatuses.includes(guest.status) && guest.calledAt
			? formatElapsed(now - new Date(guest.calledAt).valueOf())
			: null;

	return (
		<Card className="ticket-summary" data-status={guest.status}>
			<div className="ticket">
				<p className="label">{t.ticket}</p>
				<p className="number">{guest.queuePosition ?? t.unplaced}</p>
			</div>
			<p className="status">
				<span className="status-label">{statusLabel}</span>
				{elapsed ? <span className="timer">{elapsed}</span> : null}
			</p>
		</Card>
	);
}
