import styled from '@emotion/styled';
import { MenuItem } from '@mui/material';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { useRootStore } from '../../stores/react/store-context';
import { OverflowMenu } from './OverflowMenu';
import type { HistoricalEvent } from './types';

const Row = styled.li`
	display: flex;
	min-height: 68px;
	align-items: center;
	gap: 4px;
	padding: 4px 0;
	border-bottom: 1px solid var(--color-divider);

	/* The day, times, and count: one tap target when it opens the session, as a ticket chip is. */
	.history-summary {
		display: flex;
		flex: 1;
		align-items: center;
		gap: 12px;
		min-width: 0;
		min-height: 60px;
		padding: 4px 8px 4px 0;
	}

	.history-open {
		border: 0;
		border-radius: var(--radius-md);
		color: inherit;
		background: transparent;
		font: inherit;
		text-align: start;
		cursor: pointer;
	}

	.history-open:hover {
		background: var(--color-surface-soft);
	}

	.history-open:active {
		background: var(--color-border);
	}

	.history-day {
		display: grid;
		flex-shrink: 0;
		width: 48px;
		justify-items: center;
		line-height: 1.1;
	}

	.history-day span:not(.sr-only) {
		color: var(--color-text-subtle);
		font-size: 12px;
		font-weight: 700;
		text-transform: uppercase;
	}

	.history-day strong {
		color: var(--color-brand-dark);
		font-size: 22px;
	}

	.history-times {
		display: grid;
		flex: 1;
		gap: 4px;
		justify-items: start;
		min-width: 0;
	}

	/* A status, not a control: small and flat. */
	.history-state {
		padding: 2px 9px;
		border-radius: var(--radius-pill);
		background: var(--color-surface-strong);
		color: var(--color-text-muted);
		font-size: 12px;
		font-weight: 700;
	}

	.history-count {
		display: grid;
		justify-items: end;
	}

	.history-count strong {
		font-size: 20px;
	}

	.history-count span {
		color: var(--color-text-subtle);
		font-size: 12px;
	}
`;

export type SessionHistoryRowProps = {
	session: HistoricalEvent;
	/** Opens the add-guest dialog for this session, limited to recording someone already served. */
	onRecordServedGuest: () => void;
	onRecordHousehold?: () => void;
	/** Opens the session's participants. Without it, the row is not a link. */
	onOpen?: () => void;
};

/**
 * One past session: the day it ran, its registration window, that it closed, and how many guests
 * it had. For whoever may read past sessions' guests, the row opens them, as a ticket opens on the
 * queue. What else is still possible on it sits in the row's menu: recording someone served outside
 * the app, and for a data steward, deleting a session that was only a test.
 */
export const SessionHistoryRow = observer(function SessionHistoryRow({
	session,
	onRecordServedGuest,
	onRecordHousehold,
	onOpen,
}: SessionHistoryRowProps) {
	const t = adminTranslations.en;
	const { admin, translations } = useRootStore();
	const opens = new Date(session.registrationOpensAt);
	const closes = new Date(session.registrationClosesAt);
	const weekday = new Intl.DateTimeFormat(translations.locale, { weekday: 'short' }).format(opens);
	const day = new Intl.DateTimeFormat(translations.locale, { day: 'numeric' }).format(opens);
	const fullDate = new Intl.DateTimeFormat(translations.locale, { dateStyle: 'full' }).format(
		opens,
	);
	const registrationWindow = new Intl.DateTimeFormat(translations.locale, {
		timeStyle: 'short',
	}).formatRange(opens, closes);

	const summary = (
		<>
			<span className="history-day">
				<span aria-hidden="true">{weekday}</span>
				<strong aria-hidden="true">{day}</strong>
				<span className="sr-only">{fullDate}</span>
			</span>
			<span className="history-times">
				<strong>{registrationWindow}</strong>
				<span className="history-state">{t.sessionClosed}</span>
			</span>
			<span className="history-count">
				<strong>{session.guestCount}</strong>
				<span>{t.sessionGuests}</span>
			</span>
		</>
	);

	return (
		<Row className="history-row">
			{onOpen ? (
				<button
					type="button"
					className="history-summary history-open"
					aria-label={t.participants.openSession.replace('{date}', fullDate)}
					onClick={onOpen}
				>
					{summary}
				</button>
			) : (
				<span className="history-summary">{summary}</span>
			)}
			<OverflowMenu label={`${t.sessionActions}, ${fullDate}`}>
				{(closeMenu) => (
					<>
						{onRecordHousehold ? (
							<MenuItem
								onClick={() => {
									closeMenu();
									onRecordHousehold();
								}}
							>
								{t.householdService.title}
							</MenuItem>
						) : null}
						<MenuItem
							onClick={() => {
								closeMenu();
								onRecordServedGuest();
							}}
						>
							{t.recordServedGuest}
						</MenuItem>
						{admin.can('delete:guest-data') ? (
							<MenuItem
								sx={{ color: 'error.main' }}
								onClick={() => {
									closeMenu();
									void admin.sessionDeletion.open(session.id);
								}}
							>
								{t.sessionDeletion.menuItem}
							</MenuItem>
						) : null}
					</>
				)}
			</OverflowMenu>
		</Row>
	);
});
