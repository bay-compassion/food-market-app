import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { VisitHistoryEntry } from '../../models/visit-history-entry';
import { useQueueDesk } from './queue-desk-context';

const Panel = styled.section`
	padding: 14px 16px 6px;
	border-radius: var(--radius-lg);
	background: var(--color-surface-soft);

	h2 {
		margin: 0 0 6px;
		font-family: var(--font-heading);
		font-size: 16px;
		font-weight: 700;
	}

	ol {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 2px 12px;
		padding: 8px 0;
		border-top: 1px solid var(--color-border);
	}

	li:first-of-type {
		border-top: 0;
	}

	.title {
		font-size: 15px;
		font-weight: 600;
	}

	.byline {
		grid-column: 1;
		color: var(--color-text-subtle);
		font-size: 13px;
	}

	time {
		grid-row: 1 / span 2;
		grid-column: 2;
		align-self: center;
		color: var(--color-text-subtle);
		font-size: 13px;
		font-variant-numeric: tabular-nums;
	}

	.empty {
		margin: 0;
		padding: 4px 0 10px;
		color: var(--color-text-subtle);
		font-size: 14px;
	}
`;

const timeFormat = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

/**
 * What has happened to the open ticket's visit, newest first: each change, who made it, and when.
 * Nothing is drawn until the history has loaded, so the sheet does not flash an empty state.
 */
export const TicketHistory = observer(function TicketHistory() {
	const t = adminTranslations.en.queueDesk.history;
	const { history } = useQueueDesk();

	if (history === null) {
		return null;
	}

	const entries = history.map((event) => new VisitHistoryEntry(event, t)).reverse();

	return (
		<Panel className="ticket-history" aria-label={t.title}>
			<h2>{t.title}</h2>
			{entries.length ? (
				<ol>
					{entries.map((entry) => (
						<li key={entry.id}>
							<span className="title">{entry.title}</span>
							<span className="byline">{entry.byline}</span>
							<time dateTime={entry.at.toISOString()}>{timeFormat.format(entry.at)}</time>
						</li>
					))}
				</ol>
			) : (
				<p className="empty">{t.empty}</p>
			)}
		</Panel>
	);
});
