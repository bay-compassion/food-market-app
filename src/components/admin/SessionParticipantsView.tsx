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
import { TicketSheet } from '../queue/TicketSheet';
import { tabBarHeight, wideLayoutQuery } from './admin-layout';
import { ParticipantTicket } from './ParticipantTicket';
import { SessionParticipantLists } from './SessionParticipantLists';

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

	/* Desk: the list and the open ticket side by side, filling the height the dashboard gives. */
	&[data-layout='desk'] {
		grid-template-rows: auto minmax(0, 1fr);
		min-height: 0;
	}

	.ticket-panes {
		grid-row: -2;
	}

	header {
		display: grid;
		gap: 4px;
		justify-items: start;
	}

	/* Back to the sessions, as a quiet link above what it leads back from. */
	.back {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 40px;
		/*
		 * Pulled up and in by the room the 40px tap target leaves around its text, so the text lines
		 * up with where every screen's content starts, under the dashboard's heading.
		 */
		margin-block: -8px -4px;
		margin-inline-start: -8px;
		padding: 0 10px;
		border: 0;
		border-radius: var(--radius-pill);
		color: var(--color-brand);
		background: transparent;
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}

	.back:hover {
		background: var(--color-surface-soft);
	}

	h2 {
		margin: 0;
		font-family: var(--font-heading);
		font-size: 22px;
	}

	header p,
	.message {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 14px;
	}

	.message {
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
 * recorded wrong on the day is corrected.
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
		<SessionParticipantLists participants={participants} />
	);

	return (
		<TicketListProvider value={store}>
			<Layout
				className="session-participants"
				data-layout={isDesk ? 'desk' : 'phone'}
				data-ticket-open={store.selected !== null}
			>
				<header>
					<button type="button" className="back" onClick={onBack}>
						<span aria-hidden="true">←</span>
						{t.back}
					</button>
					{when ? <h2>{when}</h2> : null}
					<p>
						{participants ? `${t.count.replace('{count}', String(participants.count))} · ` : ''}
						{t.intro}
					</p>
				</header>
				{isDesk ? (
					<TicketPanes list={list}>
						<TicketPane emptyText={t.noTicketOpen}>
							{(guest) => <ParticipantTicket guest={guest} />}
						</TicketPane>
					</TicketPanes>
				) : (
					<>
						{list}
						<TicketSheet>{(guest) => <ParticipantTicket guest={guest} />}</TicketSheet>
					</>
				)}
			</Layout>
		</TicketListProvider>
	);
});
