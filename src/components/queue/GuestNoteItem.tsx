import styled from '@emotion/styled';
import { MenuItem } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import type { GuestNoteRecord } from '../../models/guest-note';
import { formatTicketTime } from '../../services/ticket-time';
import type { GuestNotesStore } from '../../stores/guest-notes.store';
import { useRootStore } from '../../stores/react/store-context';
import { OverflowMenu } from '../admin/OverflowMenu';
import { GuestNoteDialog } from './GuestNoteDialog';

const Item = styled.li`
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	align-items: start;
	gap: 8px;
	padding: 10px 0;
	border-top: 1px solid var(--color-border);

	&:first-of-type {
		border-top: 0;
	}

	.content {
		display: grid;
		gap: 4px;
	}

	.body {
		margin: 0;
		font-size: 15px;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.kind {
		margin: 0;
		font-size: 15px;
		font-weight: 600;
	}

	.category {
		justify-self: start;
		padding: 2px 10px;
		border-radius: var(--radius-pill);
		background: var(--color-background);
		font-size: 13px;
		font-weight: 700;
	}

	.byline {
		color: var(--color-text-subtle);
		font-size: 13px;
	}

	/* Pulled up and in, so the dots sit level with the note's first line. */
	.more-actions {
		margin: -6px -8px 0 0;
	}
`;

/**
 * One note: its category, its words (or, for a structured note, what it records), who wrote it and
 * when. A note the server marked `editable` has an action menu to edit it in a dialog or delete it.
 */
export const GuestNoteItem = observer(function GuestNoteItem({
	note,
	store,
}: {
	note: GuestNoteRecord;
	store: GuestNotesStore;
}) {
	const t = adminTranslations.en.queueDesk.guestNotes;
	const { confirmation } = useRootStore();
	const [isEditing, setIsEditing] = useState(false);
	const createdAt = new Date(note.createdAt);

	const remove = async () => {
		const confirmed = await confirmation.ask({
			question: t.deleteConfirm,
			details: [t.deleteConfirmDetails],
			confirmLabel: t.delete,
			dismissLabel: t.cancel,
			destructive: true,
		});

		if (confirmed) {
			await store.remove(note);
		}
	};

	return (
		<Item>
			<div className="content">
				{note.categoryLabel ? <span className="category">{note.categoryLabel}</span> : null}
				{note.kind === 'screenshot_notice' ? (
					<p className="kind">{t.screenshotNotice.entry}</p>
				) : null}
				{note.body ? <p className="body">{note.body}</p> : null}
				<span className="byline">
					{[
						note.authorName ?? t.unknownAuthor,
						formatTicketTime(createdAt, new Date()),
						note.updatedAt !== note.createdAt ? t.edited : null,
					]
						.filter(Boolean)
						.join(' · ')}
				</span>
			</div>
			{note.editable ? (
				<>
					<OverflowMenu label={t.actions} disabled={store.isSaving(note)}>
						{(closeMenu) => [
							<MenuItem
								key="edit"
								onClick={() => {
									closeMenu();
									setIsEditing(true);
								}}
							>
								{t.edit}
							</MenuItem>,
							<MenuItem
								key="delete"
								sx={{ color: 'error.main', fontWeight: 700 }}
								onClick={() => {
									closeMenu();
									void remove();
								}}
							>
								{t.delete}
							</MenuItem>,
						]}
					</OverflowMenu>
					<GuestNoteDialog
						note={note}
						open={isEditing}
						store={store}
						onClose={() => setIsEditing(false)}
					/>
				</>
			) : null}
		</Item>
	);
});
