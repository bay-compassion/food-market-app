import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import type { GuestAdmission } from '../../services/guestAdmission';
import { useRootStore } from '../../stores/react/store-context';
import { ManualGuestForm } from './ManualGuestForm';
import type { HistoricalEvent, ManualGuest } from './types';

export type SessionHistoryViewProps = {
	history: HistoricalEvent[];
	busy?: boolean;
	onAddGuest: (guest: ManualGuest, marketEventId: string) => void;
};

/** A finished session only accepts an after-the-fact record of someone already served. */
const endedAdmissions: GuestAdmission[] = ['served'];

const Section = styled.section`
	.history-list {
		display: grid;
		gap: 12px;
	}

	.history-entry {
		display: grid;
		gap: 12px;
		padding: 18px;
		border: 1.5px solid #c7d2cc;
		border-radius: var(--radius-md);
	}

	.history-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 14px;
		align-items: center;
	}

	.history-row > div {
		display: grid;
		gap: 4px;
	}

	.history-row > div:nth-of-type(2) {
		text-align: end;
	}

	.history-row span:not(.event-state) {
		color: var(--color-text-subtle);
		font-size: 13px;
	}

	.history-row .event-state,
	.history-row .add-guest-button {
		grid-column: 1 / -1;
		justify-self: start;
	}

	.event-state {
		padding: 9px 13px;
		border-radius: var(--radius-pill);
		background: #edf0ee;
		color: var(--color-text-subtle);
		font-size: 13px;
		font-weight: 700;
	}

	@media (min-width: 860px) {
		.history-row {
			grid-template-columns: minmax(0, 1fr) auto auto;
		}

		.history-row .event-state {
			grid-column: auto;
			justify-self: end;
		}
	}
`;

/** Past sessions, and the one thing still possible on them: recording a guest served out of band. */
export const SessionHistoryView = observer(function SessionHistoryView({
	history,
	busy,
	onAddGuest,
}: SessionHistoryViewProps) {
	const t = adminTranslations.en;
	const { translations } = useRootStore();
	const [openEventId, setOpenEventId] = useState<string | null>(null);

	function formatEventDate(value: string) {
		return new Intl.DateTimeFormat(translations.locale, {
			dateStyle: 'medium',
			timeStyle: 'short',
		}).format(new Date(value));
	}

	function addGuest(guest: ManualGuest, marketEventId: string) {
		setOpenEventId(null);
		onAddGuest(guest, marketEventId);
	}

	return (
		<Section className="admin-section history-section">
			{history.length ? (
				<div className="history-list">
					{history.map((pastEvent) => (
						<div key={pastEvent.id} className="history-entry">
							<article className="history-row">
								<div>
									<strong>{formatEventDate(pastEvent.registrationOpensAt)}</strong>
									<span>{formatEventDate(pastEvent.registrationClosesAt)}</span>
								</div>
								<div>
									<strong>{pastEvent.guestCount}</strong>
									<span>{t.sessionGuests}</span>
								</div>
								<span className="event-state ended">{t.closeSession}</span>
								{/* Records a guest who was served out of band, after this session had ended. */}
								{openEventId !== pastEvent.id ? (
									<button
										className="add-guest-button"
										type="button"
										onClick={() => setOpenEventId(pastEvent.id)}
									>
										+ {t.addGuest}
									</button>
								) : null}
							</article>
							{openEventId === pastEvent.id ? (
								<ManualGuestForm
									admissions={endedAdmissions}
									busy={busy}
									onSubmit={(guest) => addGuest(guest, pastEvent.id)}
									onCancel={() => setOpenEventId(null)}
								/>
							) : null}
						</div>
					))}
				</div>
			) : (
				<p className="empty-state">{t.noHistory}</p>
			)}
		</Section>
	);
});
