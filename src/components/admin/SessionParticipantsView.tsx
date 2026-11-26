import styled from '@emotion/styled';
import { Button } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';

import { adminTranslations } from '../../adminLocales';
import { useRootStore } from '../../stores/react/store-context';
import { TicketListProvider } from '../queue/ticket-list-context';
import { TicketPane } from '../queue/TicketPane';
import { TicketPanes } from '../queue/TicketPanes';
import { TicketSearchDialog } from '../queue/TicketSearchDialog';
import { TicketSheet } from '../queue/TicketSheet';
import { tabBarHeight, wideLayoutQuery } from './admin-layout';
import { BulkCorrectionBar } from './BulkCorrectionBar';
import { ParticipantTicket } from './ParticipantTicket';
import { SessionParticipantLists } from './SessionParticipantLists';
import { SessionParticipantsHeader } from './SessionParticipantsHeader';

const Layout = styled.div`
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	gap: 12px;
	/* The open ticket's sheet sits on the dashboard's tab bar, which has taken the safe area. */
	--queue-dock-inset: calc(${tabBarHeight}px + env(safe-area-inset-bottom));
	--queue-dock-safe-area: 0px;

	/* Room to scroll the last tickets up past the open sheet, as on the queue. */
	&[data-layout='phone'][data-ticket-open='true'] {
		padding-bottom: 75dvh;
	}

	/* Room to scroll the last tickets up past the docked bar of what to do with the selection. */
	&[data-layout='phone'][data-selecting='true'] {
		padding-bottom: 240px;
	}

	/* Desk: the list and the open ticket side by side, filling the height the dashboard gives. */
	&[data-layout='desk'] {
		grid-template-rows: auto minmax(0, 1fr);
		min-height: 0;
	}

	.ticket-panes {
		grid-row: -2;
	}

	.message {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 14px;
		display: grid;
		gap: 12px;
		justify-items: start;
		padding: 12px 0;
	}
`;

export type SessionParticipantsViewProps = {
	/** The ended session the route names. */
	sessionId: string;
	onBack: () => void;
};

/**
 * The session history's subview: who took part in one ended session, laid out as the queue is. On a
 * phone, tickets in folding sections fill the screen and a tapped ticket opens as a sheet on the tab
 * bar; on a desk, the open ticket sits in a pane to the right. The ticket is where a status that was
 * recorded wrong on the day is corrected. Selecting instead picks out several guests to correct
 * together, from a bar docked on the tab bar or, on a desk, under the list. Searching finds a
 * guest anywhere in the session, and the sections can be read by name rather than number.
 */
export const SessionParticipantsView = observer(function SessionParticipantsView({
	sessionId,
	onBack,
}: SessionParticipantsViewProps) {
	const t = adminTranslations.en.participants;
	const { admin, translations } = useRootStore();
	const store = admin.sessionParticipants;
	const isDesk = useMediaQuery(wideLayoutQuery);
	const session = admin.history.find(({ id }) => id === sessionId);
	const participants = store.participants;

	useEffect(() => {
		void store.load(sessionId);

		return () => store.close();
	}, [store, sessionId]);

	const when = session
		? new Intl.DateTimeFormat(translations.locale, {
				dateStyle: 'full',
				timeStyle: 'short',
			}).format(new Date(session.registrationOpensAt))
		: null;

	const list = store.loadFailed ? (
		<div className="message" role="alert">
			<p>{t.loadFailed}</p>
			<Button variant="outlined" onClick={() => void store.load(sessionId)}>
				{t.retry}
			</Button>
		</div>
	) : participants === null ? (
		<p className="message" role="status">
			{t.loading}
		</p>
	) : participants.count === 0 ? (
		<p className="message">{t.empty}</p>
	) : (
		<SessionParticipantLists />
	);

	return (
		<TicketListProvider value={store}>
			<Layout
				className="session-participants"
				data-layout={isDesk ? 'desk' : 'phone'}
				data-ticket-open={store.selected !== null}
				data-selecting={store.isSelecting}
			>
				<SessionParticipantsHeader when={when} onBack={onBack} />
				{isDesk ? (
					<TicketPanes list={list} footer={<BulkCorrectionBar docked={false} />}>
						<TicketPane emptyText={t.noTicketOpen}>
							{(guest) => <ParticipantTicket guest={guest} />}
						</TicketPane>
					</TicketPanes>
				) : (
					<>
						{list}
						<BulkCorrectionBar docked />
						<TicketSheet>{(guest) => <ParticipantTicket guest={guest} />}</TicketSheet>
					</>
				)}
				<TicketSearchDialog />
			</Layout>
		</TicketListProvider>
	);
});
