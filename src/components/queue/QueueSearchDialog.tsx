import styled from '@emotion/styled';
import { Dialog, IconButton } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';

import { adminTranslations } from '../../adminLocales';
import type { TicketSectionId } from '../../stores/queue-desk.store';
import { wideLayoutQuery } from '../admin/admin-layout';
import { useNow } from '../hooks/use-now';
import { useQueueDesk } from './queue-desk-context';
import { QueueSearchField } from './QueueSearchField';
import { TicketChip } from './TicketChip';

// The dialog renders in a portal, outside the queue screen's frame, so it carries its own styles.
const Panel = styled.div`
	flex: 1 1 auto;
	display: grid;
	grid-template-rows: auto minmax(0, 1fr);
	gap: 12px;
	min-height: 0;
	padding: 16px 12px calc(16px + env(safe-area-inset-bottom));
	color: var(--color-text);
	font-family: var(--font-body);

	.top {
		display: flex;
		gap: 4px;
		align-items: center;
	}

	.results {
		display: grid;
		align-content: start;
		gap: 14px;
		min-height: 0;
		overflow-y: auto;
	}

	h3 {
		margin: 0;
		padding: 0 8px 4px;
		color: var(--color-text-muted);
		font-size: 13px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	ul {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 2px;
		margin: 0;
		padding: 0;
	}

	.message {
		margin: 0;
		padding: 16px 8px;
		color: var(--color-text-subtle);
		font-size: 15px;
		line-height: 1.5;
	}
`;

function CloseIcon() {
	return (
		<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none">
			<path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
		</svg>
	);
}

/** Whether a key press landed in something the volunteer is typing into. */
function isTyping(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLElement &&
		(target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
	);
}

/**
 * Finds a ticket anywhere in the line — by name, number, phone number, or name tag code — and
 * opens it, which puts the search away. Full screen on a phone; on the desk, a dialog over the
 * line that `/` opens from the keyboard.
 */
export const QueueSearchDialog = observer(function QueueSearchDialog() {
	const t = adminTranslations.en.queueDesk;
	const desk = useQueueDesk();
	const isWide = useMediaQuery(wideLayoutQuery);
	const now = useNow(desk.isSearching ? 30_000 : null);
	const { search, searchResults } = desk;
	const titles: Record<TicketSectionId, string> = {
		called: t.called,
		waiting: t.waiting,
		noShows: t.noShows,
		notPlaced: t.notPlaced,
		done: t.done,
	};

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (
				event.key === '/' &&
				!event.metaKey &&
				!event.ctrlKey &&
				!event.altKey &&
				!isTyping(event.target)
			) {
				event.preventDefault();
				desk.openSearch();
			}
		};

		window.addEventListener('keydown', onKeyDown);

		return () => window.removeEventListener('keydown', onKeyDown);
	}, [desk]);

	return (
		<Dialog
			open={desk.isSearching}
			onClose={() => desk.closeSearch()}
			fullScreen={!isWide}
			fullWidth
			maxWidth="sm"
			// Pinned to the top on the desk, so the field doesn't move as the results grow and shrink.
			sx={{ '& .MuiDialog-container': { alignItems: isWide ? 'flex-start' : undefined } }}
			slotProps={{
				paper: {
					'aria-label': t.search,
					dir: 'ltr',
					lang: 'en',
					sx: { height: isWide ? '70dvh' : undefined },
				},
			}}
		>
			<Panel>
				<div className="top">
					<QueueSearchField />
					<IconButton aria-label={t.closeSearch} onClick={() => desk.closeSearch()}>
						<CloseIcon />
					</IconButton>
				</div>
				<div className="results" aria-live="polite">
					{!search.isActive ? (
						<p className="message">{t.searchHint}</p>
					) : searchResults.length === 0 ? (
						<p className="message">{t.noMatches}</p>
					) : (
						searchResults.map(({ section, guests }) => (
							<section key={section} aria-label={titles[section]}>
								<h3>{titles[section]}</h3>
								<ul>
									{guests.map((guest) => (
										<TicketChip key={guest.id} guest={guest} now={now} />
									))}
								</ul>
							</section>
						))
					)}
				</div>
			</Panel>
		</Dialog>
	);
});
