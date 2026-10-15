import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import { SessionHistoryMonths } from '../../models/session-history-months';
import type { GuestAdmission } from '../../services/guestAdmission';
import { useRootStore } from '../../stores/react/store-context';
import { ManualGuestDialog } from './ManualGuestDialog';
import { SessionHistoryRow } from './SessionHistoryRow';
import type { HistoricalEvent, ManualGuest } from './types';

export type SessionHistoryViewProps = {
	history: HistoricalEvent[];
	busy?: boolean;
	onAddGuest: (guest: ManualGuest, marketEventId: string) => void;
};

/** A finished session only accepts an after-the-fact record of someone already served. */
/*
 * Deliberately not `manualAdmissionsFor`: every add here attaches a record to one finished session,
 * so saving a guest's details alone — which belongs to no session — is offered on the live screens
 * and the guest database instead.
 */
const endedAdmissions: GuestAdmission[] = ['served'];

const Section = styled.section`
	display: grid;
	gap: 18px;

	/* A month's heading reads as a divider over its sessions, not as a section of its own. */
	&& h2 {
		margin: 0;
		padding-bottom: 6px;
		border-bottom: 1px solid #e2e6e3;
		color: var(--color-text-subtle);
		font-family: var(--font-body);
		font-size: 13px;
		letter-spacing: 0.08em;
	}

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}
`;

/** Past sessions by month, and the one thing still possible on them: recording a guest served out of band. */
export const SessionHistoryView = observer(function SessionHistoryView({
	history,
	busy,
	onAddGuest,
}: SessionHistoryViewProps) {
	const t = adminTranslations.en;
	const { translations } = useRootStore();
	const [openEventId, setOpenEventId] = useState<string | null>(null);
	const months = new SessionHistoryMonths(history).months;
	const monthName = new Intl.DateTimeFormat(translations.locale, {
		month: 'long',
		year: 'numeric',
	});

	function addGuest(guest: ManualGuest, marketEventId: string) {
		setOpenEventId(null);
		onAddGuest(guest, marketEventId);
	}

	return (
		<Section className="admin-section history-section">
			{months.length ? (
				months.map((month) => (
					<section key={month.key} aria-labelledby={`history-${month.key}`}>
						<h2 id={`history-${month.key}`}>{monthName.format(month.start)}</h2>
						<ul>
							{month.sessions.map((session) => (
								<SessionHistoryRow
									key={session.id}
									session={session}
									onRecordServedGuest={() => setOpenEventId(session.id)}
								/>
							))}
						</ul>
					</section>
				))
			) : (
				<p className="empty-state">{t.noHistory}</p>
			)}
			<ManualGuestDialog
				open={openEventId !== null}
				admissions={endedAdmissions}
				busy={busy}
				onSubmit={(guest) => {
					if (openEventId !== null) {
						addGuest(guest, openEventId);
					}
				}}
				onClose={() => setOpenEventId(null)}
			/>
		</Section>
	);
});
