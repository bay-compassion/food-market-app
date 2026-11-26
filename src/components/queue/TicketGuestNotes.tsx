import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import { useRootStore } from '../../stores/react/store-context';
import { ChoiceChips } from '../admin/ChoiceChips';
import { AddNoteButton } from './AddNoteButton';
import { GuestNoteDialog } from './GuestNoteDialog';
import { GuestNoteItem } from './GuestNoteItem';

/** The filter value for every note: a label no category can have, as labels are never empty. */
const allCategories = '';

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
	filterable = false,
}: {
	guestId: string;
	/**
	 * Offers a row of filters, one per category the notes are filed under, over the list — for a
	 * guest's profile, where every note they have is read rather than glanced at.
	 */
	filterable?: boolean;
}) {
	const t = adminTranslations.en.queueDesk.guestNotes;
	const { admin } = useRootStore();
	const [store] = useState(() => admin.createGuestNotesStore(guestId));
	const [isAdding, setIsAdding] = useState(false);
	const [category, setCategory] = useState<string | null>(null);
	const notes = store.notes;
	const categories = notes?.categories ?? [];
	// A filter whose last note was deleted or refiled falls back to every note.
	const shownCategory = categories.some(({ label }) => label === category) ? category : null;

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
			{filterable && notes && categories.length > 0 ? (
				<ChoiceChips
					label={t.filterLabel}
					options={[
						{ value: allCategories, label: t.allNotes.replace('{count}', String(notes.count)) },
						...categories.map(({ label, count }) => ({
							value: label,
							label: t.categoryFilter.replace('{label}', label).replace('{count}', String(count)),
						})),
					]}
					value={shownCategory ?? allCategories}
					onChange={(value) => setCategory(value === allCategories ? null : value)}
				/>
			) : null}
			{store.loadFailed ? (
				<p className="empty">{t.loadFailed}</p>
			) : notes === null ? null : notes.isEmpty ? (
				<p className="empty">{t.empty}</p>
			) : (
				<ol>
					{notes.filedUnder(shownCategory).map((note) => (
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
