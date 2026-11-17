import styled from '@emotion/styled';
import type { ReactNode } from 'react';

const Panes = styled.div`
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(400px, 520px);
	gap: 20px;
	min-height: 0;

	.line-pane {
		display: grid;
		grid-template-rows: minmax(0, 1fr) auto;
		gap: 12px;
		min-height: 0;
	}

	/*
	 * A scrollbar that is always there, so the desk can see at a glance that the line runs on past
	 * the window. macOS hides an overlay scrollbar until it is scrolled, whatever 'overflow' says,
	 * so the bar is drawn here. Not with 'scrollbar-width' or 'scrollbar-color': Chrome ignores
	 * these pseudo-elements once either is set.
	 */
	.line-list {
		overflow-y: scroll;
		scrollbar-gutter: stable;
		padding-inline-end: 4px;
	}

	.line-list::-webkit-scrollbar {
		width: 12px;
	}

	.line-list::-webkit-scrollbar-track {
		border-radius: var(--radius-pill);
		background: var(--color-surface-soft);
	}

	.line-list::-webkit-scrollbar-thumb {
		border: 3px solid var(--color-surface-soft);
		border-radius: var(--radius-pill);
		background: var(--color-text-subtle);
	}

	/* Firefox draws no WebKit scrollbar, and keeps its own in view when it is styled. */
	@supports not selector(::-webkit-scrollbar) {
		.line-list {
			scrollbar-color: var(--color-text-subtle) var(--color-surface-soft);
		}
	}
`;

export type TicketPanesProps = {
	/** The tickets, in their sections. Scrolls on its own. */
	list: ReactNode;
	/** Kept in view under the list, such as the queue's call button. */
	footer?: ReactNode;
	/** The open ticket's pane. */
	children: ReactNode;
};

/**
 * A desk-sized screen's ticket list and open ticket, side by side and filling the height they are
 * given, each scrolling on its own so a long list never pushes the ticket out of view.
 */
export function TicketPanes({ list, footer, children }: TicketPanesProps) {
	return (
		<Panes className="ticket-panes">
			<div className="line-pane">
				<div className="line-list">{list}</div>
				{footer}
			</div>
			{children}
		</Panes>
	);
}
