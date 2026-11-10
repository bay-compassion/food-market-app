import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { useQueueDesk } from './queue-desk-context';
import { QueueActionsMenu } from './QueueActionsMenu';
import { SearchIcon } from './SearchIcon';

const Toolbar = styled.div`
	display: flex;
	gap: 4px;
	align-items: center;

	/* Looks like a field, so it reads as where to search; it opens the same dialog the icon does. */
	.search-opener {
		display: flex;
		flex: 1;
		gap: 10px;
		align-items: center;
		min-width: 0;
		min-height: 48px;
		padding: 0 16px;
		border: 1px solid var(--color-border-soft);
		border-radius: var(--radius-pill);
		color: var(--color-text-subtle);
		background: var(--color-background);
		font: inherit;
		font-size: 15px;
		text-align: start;
		cursor: text;
	}

	.search-opener span {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
`;

/**
 * The top of the line inside the dashboard's Queue tab. The dashboard's own heading already names
 * the screen and the session's state, so all that is left of the standalone screen's header is
 * searching the line and the rarer actions.
 */
export const QueueToolbar = observer(function QueueToolbar() {
	const t = adminTranslations.en.queueDesk;
	const desk = useQueueDesk();

	return (
		<Toolbar className="queue-toolbar">
			<button
				type="button"
				className="search-opener"
				aria-label={t.openSearch}
				aria-keyshortcuts="/"
				aria-haspopup="dialog"
				onClick={() => desk.openSearch()}
			>
				<SearchIcon />
				<span aria-hidden="true">{t.searchPlaceholder}</span>
			</button>
			<QueueActionsMenu embedded />
		</Toolbar>
	);
});
