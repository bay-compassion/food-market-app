import styled from '@emotion/styled';
import type { ReactNode } from 'react';

import type { QueueGuest } from '../../services/admin-api';
import type { QueueSectionId } from '../../stores/queue-desk.store';
import { QueueSection } from './QueueSection';
import { TicketChip } from './TicketChip';

export type TicketSectionProps = {
	id: QueueSectionId;
	title: string;
	guests: QueueGuest[];
	/**
	 * Shown in place of the list when there are no guests. Without one, an empty section is left
	 * off the screen entirely — for the buckets that are usually empty and only worth a heading
	 * once someone is in them.
	 */
	emptyText?: string;
	now: number;
	/** A control drawn on the heading line opposite the title, such as adding a guest. */
	action?: ReactNode;
};

const List = styled.ul`
	/* A track that can shrink, or a long name widens the whole page rather than truncating. */
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	gap: 2px;
	margin: 0;
	padding: 0;
`;

const Empty = styled.p`
	margin: 0;
	padding: 6px 8px 8px;
	color: var(--color-text-subtle);
	font-size: 14px;
`;

/** One bucket of tickets on the queue screen — called, waiting, and so on — as tappable rows. */
export function TicketSection({ id, title, guests, emptyText, now, action }: TicketSectionProps) {
	if (!guests.length && emptyText === undefined) {
		return null;
	}

	return (
		<QueueSection id={id} title={title} count={guests.length} action={action}>
			{guests.length ? (
				<List>
					{guests.map((guest) => (
						<TicketChip key={guest.id} guest={guest} now={now} />
					))}
				</List>
			) : (
				<Empty>{emptyText}</Empty>
			)}
		</QueueSection>
	);
}
