import styled from '@emotion/styled';
import type { ReactNode } from 'react';

import { QueueGuestTable } from './QueueGuestTable';

export type QueueSectionProps = {
	title: string;
	count: number;
	/** Shown in place of the list when `count` is zero. */
	emptyText: string;
	open: boolean;
	onToggle: () => void;
	/** A control that belongs to the section, drawn on the heading line opposite the title. */
	action?: ReactNode;
	children: ReactNode;
};

const Section = styled.section`
	margin-top: 22px;

	.section-heading {
		display: flex;
		gap: 12px;
		justify-content: space-between;
		align-items: center;
		min-height: 44px;
	}

	.section-toggle {
		display: flex;
		gap: 8px;
		align-items: center;
		min-height: 44px;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--color-text-muted);
		font-family: var(--font-heading);
		font-size: 15px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.section-toggle svg {
		transition: transform 150ms ease;
	}

	.section-toggle[aria-expanded='false'] svg {
		transform: rotate(-90deg);
	}

	.queue-count {
		display: inline-grid;
		place-items: center;
		min-width: 22px;
		height: 22px;
		padding: 0 7px;
		border-radius: var(--radius-pill);
		color: var(--color-brand);
		background: var(--color-surface-soft);
		font-family: var(--font-body);
		font-size: 13px;
		letter-spacing: 0;
	}

	.empty-state {
		padding: 10px 0;
		color: var(--color-text-subtle);
		font-size: 14px;
	}
`;

function Chevron() {
	return (
		<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none">
			<path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
		</svg>
	);
}

/**
 * One collapsible list on the queue screen: a quiet heading with its tally that folds the list
 * away, then the rows or an empty state.
 */
export function QueueSection({
	title,
	count,
	emptyText,
	open,
	onToggle,
	action,
	children,
}: QueueSectionProps) {
	return (
		<Section className="queue-section">
			<div className="section-heading">
				<h2>
					<button className="section-toggle" type="button" aria-expanded={open} onClick={onToggle}>
						<Chevron />
						{title}
						<span className="queue-count">{count}</span>
					</button>
				</h2>
				{action}
			</div>
			{open ? (
				count ? (
					<QueueGuestTable label={title}>{children}</QueueGuestTable>
				) : (
					<p className="empty-state">{emptyText}</p>
				)
			) : null}
		</Section>
	);
}
