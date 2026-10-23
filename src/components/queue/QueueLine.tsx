import styled from '@emotion/styled';
import useMediaQuery from '@mui/material/useMediaQuery';
import { observer } from 'mobx-react-lite';

import { wideLayoutQuery } from '../admin/admin-layout';
import { AdminFeedbackBanner } from '../admin/AdminFeedbackBanner';
import { GuestClaimDialog } from '../admin/GuestClaimDialog';
import { QueueCallButton } from './QueueCallButton';
import { QueueDeskHeader } from './QueueDeskHeader';
import { QueueLists } from './QueueLists';
import { TicketPane } from './TicketPane';
import { TicketSheet } from './TicketSheet';

const Layout = styled.div`
	display: grid;
	gap: 12px;

	.admin-feedback {
		padding: 12px 14px;
		border-radius: var(--radius-md);
		color: var(--color-brand);
		background: var(--color-surface-soft);
	}

	/* Phone: one column, with room for the call bar fixed along the bottom edge. */
	&[data-layout='phone'] {
		padding-bottom: calc(88px + env(safe-area-inset-bottom));
	}

	.call-bar {
		position: fixed;
		inset-inline: 0;
		bottom: 0;
		padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
		background: var(--color-background);
		box-shadow: 0 -8px 24px rgb(30 71 77 / 10%);

		> * {
			max-width: 480px;
			margin-inline: auto;
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

	.panes {
		display: grid;
		grid-row: 3;
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

	.line-list {
		overflow-y: auto;
	}
`;

/**
 * The queue while service runs. On a phone, the line fills the screen, a ticket opens as a sheet
 * over it, and the call button runs along the bottom edge. On a desk-sized screen — the check-in
 * desk's computer — the open ticket sits in a pane beside the line instead, always in view.
 */
export const QueueLine = observer(function QueueLine() {
	const isDesk = useMediaQuery(wideLayoutQuery);

	return (
		<Layout data-layout={isDesk ? 'desk' : 'phone'}>
			<QueueDeskHeader />
			<AdminFeedbackBanner />
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
						<QueueCallButton />
					</div>
					<TicketSheet />
				</>
			)}
			<GuestClaimDialog />
		</Layout>
	);
});
