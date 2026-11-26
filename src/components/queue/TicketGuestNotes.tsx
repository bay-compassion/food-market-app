import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import { useRootStore } from '../../stores/react/store-context';
import { AddNoteButton } from './AddNoteButton';
import { GuestNoteDialog } from './GuestNoteDialog';
import { GuestNoteItem } from './GuestNoteItem';

const Panel = styled.section`
	display: grid;
	gap: 12px;
	padding: 14px 16px 16px;
	border-radius: var(--radius-lg);
	background: var(--color-surface-soft);

	header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 8px 12px;
	}

	h3 {
		margin: 0;
		font-family: var(--font-heading);
		font-size: 17px;
	}

	.help,
	.empty {
		margin: 0;
		color: var(--color-text-subtle);
		font-size: 14px;
	}

	.notice {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
	}

	ol {
		margin: 0;
		padding: 0;
		list-style: none;
	}
`;

/**
 * What staff keep about the open ticket's guest: every note, newest first, leading the panel, and
 * how many times the guest has been warned about screenshots. Adding one is a split button in the
 * header: the note form opens in a dialog, and the screenshot warning is one tap from its menu. The
 * guest never sees any of it. Render it with `key={guest.guestId}` so another guest's ticket reads its own notes.
 */
export const TicketGuestNotes = observer(function TicketGuestNotes({
	guestId,
}: {
	guestId: string;
}) {
	const t = adminTranslations.en.queueDesk.guestNotes;
	const { admin } = useRootStore();
	const [store] = useState(() => admin.createGuestNotesStore(guestId));
	const [isAdding, setIsAdding] = useState(false);
	const notes = store.notes;

	useEffect(() => {
		void store.load();
		void admin.noteCategories.ensureLoaded();
	}, [store, admin]);

	const noticeCount = notes?.screenshotNoticeCount ?? 0;

	return (
		<Panel className="ticket-guest-notes" aria-label={t.title}>
			<header>
				<h3>{t.title}</h3>
				<AddNoteButton
					disabled={store.isAdding || !notes}
					onAdd={() => setIsAdding(true)}
					onWarnScreenshots={() => void store.recordScreenshotNotice()}
				/>
			</header>
			{noticeCount ? (
				<p className="notice">
					{noticeCount === 1
						? t.screenshotNotice.countOne
						: t.screenshotNotice.count.replace('{count}', String(noticeCount))}
				</p>
			) : null}
			{store.loadFailed ? (
				<p className="empty">{t.loadFailed}</p>
			) : notes === null ? null : notes.isEmpty ? (
				<p className="empty">{t.empty}</p>
			) : (
				<ol>
					{notes.newestFirst.map((note) => (
						<GuestNoteItem key={note.id} note={note} store={store} />
					))}
				</ol>
			)}
			{notes?.hasLockedNotes ? <p className="help">{t.lockedHelp}</p> : null}
			<p className="help">{t.help}</p>
			<GuestNoteDialog open={isAdding} store={store} onClose={() => setIsAdding(false)} />
		</Panel>
	);
});
