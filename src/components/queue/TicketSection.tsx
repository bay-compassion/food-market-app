import styled from '@emotion/styled';
import type { ReactNode } from 'react';

import type { QueueGuest } from '../../services/admin-api';
import { TicketChip } from './TicketChip';

export type TicketSectionProps = {
	title: string;
	guests: QueueGuest[];
	/** Shown in place of the list when there are no guests. */
	emptyText: string;
	now: number;
	/** A control drawn on the heading line opposite the title, such as adding a guest. */
	action?: ReactNode;
};

const Section = styled.section`
	padding: 14px 10px 10px;
	border-radius: var(--radius-lg);
	background: var(--color-surface-soft);

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		min-height: 36px;
		padding: 0 8px 6px;
	}

	h2 {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		font-family: var(--font-heading);
		font-size: 18px;
		font-weight: 700;
	}

	.count {
		min-width: 24px;
		padding: 1px 7px;
		border-radius: var(--radius-sm);
		color: var(--color-text-muted);
		background: var(--color-background);
		font-family: var(--font-body);
		font-size: 13px;
		text-align: center;
	}

	ul {
		display: grid;
		gap: 2px;
		margin: 0;
		padding: 0;
	}

	.empty {
		margin: 0;
		padding: 6px 8px 8px;
		color: var(--color-text-subtle);
		font-size: 14px;
	}
`;

/** One bucket of tickets on the queue screen — called, waiting, or done — as tappable numbers. */
export function TicketSection({ title, guests, emptyText, now, action }: TicketSectionProps) {
	return (
		<Section aria-label={title}>
			<header>
				<h2>
					{title}
					<span className="count">{guests.length}</span>
				</h2>
				{action}
			</header>
			{guests.length ? (
				<ul>
					{guests.map((guest) => (
						<TicketChip key={guest.id} guest={guest} now={now} />
					))}
				</ul>
			) : (
				<p className="empty">{emptyText}</p>
			)}
		</Section>
	);
}
