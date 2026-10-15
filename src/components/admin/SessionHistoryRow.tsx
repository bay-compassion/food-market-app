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
	gap: 12px;
	padding: 8px 0;
	border-bottom: 1px solid #e2e6e3;

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
		background: #edf0ee;
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
};

/**
 * One past session: the day it ran, its registration window, that it closed, and how many guests
 * it had. Recording someone served outside the app is the one thing still possible on it, so it
 * is in the row's menu rather than a link under every session.
 */
export const SessionHistoryRow = observer(function SessionHistoryRow({
	session,
	onRecordServedGuest,
}: SessionHistoryRowProps) {
	const t = adminTranslations.en;
	const { translations } = useRootStore();
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

	return (
		<Row className="history-row">
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
			<OverflowMenu label={`${t.sessionActions}, ${fullDate}`}>
				{(closeMenu) => (
					<MenuItem
						onClick={() => {
							closeMenu();
							onRecordServedGuest();
						}}
					>
						{t.recordServedGuest}
					</MenuItem>
				)}
			</OverflowMenu>
		</Row>
	);
});
