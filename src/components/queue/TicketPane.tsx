import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import type { ReactNode } from 'react';

import { adminTranslations } from '../../adminLocales';
import type { QueueGuest } from '../../services/admin-api';
import { useTicketList } from './ticket-list-context';

const Pane = styled.aside`
	box-sizing: border-box;
	min-height: 0;
	padding: 16px 20px;
	overflow-y: auto;
	border: 1px solid var(--color-border);
	border-radius: var(--radius-lg);
	background: var(--color-background);

	.empty {
		margin: 0;
		padding: 24px 0;
		color: var(--color-text-subtle);
		font-size: 17px;
		text-align: center;
	}
`;

export type TicketPaneProps = {
	/** What the open ticket shows: the queue's actions, or an ended session's corrections. */
	children: (guest: QueueGuest) => ReactNode;
	/** Shown while no ticket is open. */
	emptyText: string;
};

/**
 * The open ticket on a desk-sized screen: always in view beside the list, rather than a sheet
 * over it, so the volunteer at the check-in desk sees the line and the guest in front of them at
 * once.
 */
export const TicketPane = observer(function TicketPane({ children, emptyText }: TicketPaneProps) {
	const t = adminTranslations.en.queueDesk;
	const guest = useTicketList().selected;

	return (
		<Pane aria-label={t.ticket}>
			{guest ? children(guest) : <p className="empty">{emptyText}</p>}
		</Pane>
	);
});
