import styled from '@emotion/styled';
import useMediaQuery from '@mui/material/useMediaQuery';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { tabBarHeight, wideLayoutQuery } from '../admin/admin-layout';
import { AdminFeedbackBanner } from '../admin/AdminFeedbackBanner';
import { GuestClaimDialog } from '../admin/GuestClaimDialog';
import { callBarBottom, callBarOffset, callBarPaddingBottom } from './call-bar';
import { useQueueDesk } from './queue-desk-context';
import { QueueCallBarActions } from './QueueCallBarActions';
import { QueueCallButton } from './QueueCallButton';
import { QueueDeskHeader } from './QueueDeskHeader';
import { QueueLists } from './QueueLists';
import { QueueToolbar } from './QueueToolbar';
import { TicketDetails } from './TicketDetails';
import { TicketPane } from './TicketPane';
import { TicketPanes } from './TicketPanes';
import { TicketSearchDialog } from './TicketSearchDialog';
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

	.ticket-panes {
		grid-row: -2;
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
	const t = adminTranslations.en;
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
				<TicketPanes list={<QueueLists />} footer={<QueueCallButton />}>
					<TicketPane emptyText={t.queueDesk.noTicketOpen}>
						{(guest) => <TicketDetails guest={guest} />}
					</TicketPane>
				</TicketPanes>
			) : (
				<>
					<QueueLists />
					<div className="call-bar">
						<QueueCallBarActions />
					</div>
					<TicketSheet aboveCallBar>{(guest) => <TicketDetails guest={guest} />}</TicketSheet>
				</>
			)}
			{embedded ? null : <GuestClaimDialog />}
			<TicketSearchDialog />
		</Layout>
	);
});
