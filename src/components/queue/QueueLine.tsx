import styled from '@emotion/styled';
import useMediaQuery from '@mui/material/useMediaQuery';
import { observer } from 'mobx-react-lite';

import { tabBarHeight, wideLayoutQuery } from '../admin/admin-layout';
import { AdminFeedbackBanner } from '../admin/AdminFeedbackBanner';
import { GuestClaimDialog } from '../admin/GuestClaimDialog';
import { callBarBottom, callBarOffset, callBarPaddingBottom } from './call-bar';
import { useQueueDesk } from './queue-desk-context';
import { QueueCallBarActions } from './QueueCallBarActions';
import { QueueCallButton } from './QueueCallButton';
import { QueueDeskHeader } from './QueueDeskHeader';
import { QueueLists } from './QueueLists';
import { QueueSearchDialog } from './QueueSearchDialog';
import { QueueToolbar } from './QueueToolbar';
import { TicketPane } from './TicketPane';
import { TicketSheet } from './TicketSheet';

const Layout = styled.div`
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	gap: 12px;

	.admin-feedback {
		padding: 12px 14px;
		border-radius: var(--radius-md);
		color: var(--color-brand);
		background: var(--color-surface-soft);
	}

	/* Phone: one column, with room for the call bar fixed along the bottom edge. */
	&[data-layout='phone'] {
		padding-bottom: calc(${callBarOffset} + 12px);
	}

	/*
	 * The open ticket docks on the call bar without blocking the list, so the list gets room to
	 * scroll its last tickets up past the sheet, into the strip still in view above it.
	 */
	&[data-layout='phone'][data-ticket-open='true'] {
		padding-bottom: 75dvh;
	}

	/* Inside the dashboard, the call bar and the ticket on it sit on the tab bar, not the edge. */
	&[data-embedded='true'] {
		--queue-dock-inset: calc(${tabBarHeight}px + env(safe-area-inset-bottom));
		--queue-dock-safe-area: 0px;
	}

	.call-bar {
		position: fixed;
		inset-inline: 0;
		bottom: ${callBarBottom};
		padding: 12px 16px ${callBarPaddingBottom};
		background: var(--color-background);
		box-shadow: 0 -8px 24px rgb(30 71 77 / 10%);

		> * {
			max-width: 480px;
			margin-inline: auto;
		}

		/* The call button and, when there is one, the menu beside it. */
		.call-actions {
			display: flex;
			gap: 8px;
			align-items: center;
		}

		.more-actions {
			flex-shrink: 0;
			width: 52px;
			height: 52px;
		}
	}

	/*
	 * Desk: the line and the open ticket side by side, filling the window, each scrolling on its
	 * own so a long list never pushes the ticket out of view. The frame's padding is 24px each way.
	 */
	&[data-layout='desk'] {
		grid-template-rows: auto auto minmax(0, 1fr);
		height: calc(100dvh - 48px);
	}

	/* In the dashboard, the tab gives the line whatever height is left under its heading. */
	&[data-layout='desk'][data-embedded='true'] {
		grid-template-rows: auto minmax(0, 1fr);
		height: auto;
		min-height: 0;
	}

	.panes {
		display: grid;
		grid-row: -2;
		grid-template-columns: minmax(0, 1fr) minmax(400px, 520px);
		gap: 20px;
		min-height: 0;
	}

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

export type QueueLineProps = {
	/**
	 * Inside the dashboard's Queue tab rather than on the standalone `/queue` screen. The dashboard
	 * brings its own heading, feedback line, and guest claim dialog, and a tab bar along the bottom
	 * edge that the call bar has to sit on.
	 */
	embedded?: boolean;
};

/**
 * The queue while service runs. On a phone, the line fills the screen, the call button runs along
 * the bottom edge, and a ticket opens as a sheet docked on top of it — beside the line rather than
 * blocking it, so the call button and the other tickets still take the first tap. On a desk-sized
 * screen — the check-in desk's computer — the open ticket sits in a pane beside the line instead,
 * always in view.
 */
export const QueueLine = observer(function QueueLine({ embedded = false }: QueueLineProps) {
	const isDesk = useMediaQuery(wideLayoutQuery);
	const desk = useQueueDesk();

	return (
		<Layout
			className="queue-line"
			data-layout={isDesk ? 'desk' : 'phone'}
			data-embedded={embedded}
			data-ticket-open={desk.selected !== null}
		>
			{embedded ? (
				<QueueToolbar />
			) : (
				<>
					<QueueDeskHeader />
					<AdminFeedbackBanner />
				</>
			)}
			{isDesk ? (
				<div className="panes">
					<div className="line-pane">
						<div className="line-list">
							<QueueLists />
						</div>
						<QueueCallButton />
					</div>
					<TicketPane />
				</div>
			) : (
				<>
					<QueueLists />
					<div className="call-bar">
						<QueueCallBarActions />
					</div>
					<TicketSheet />
				</>
			)}
			{embedded ? null : <GuestClaimDialog />}
			<QueueSearchDialog />
		</Layout>
	);
});
