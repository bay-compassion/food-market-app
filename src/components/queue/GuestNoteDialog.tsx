import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { GuestNote, type GuestNoteRecord, type GuestNoteRevision } from '../../models/guest-note';
import type { GuestNotesStore } from '../../stores/guest-notes.store';
import { useRootStore } from '../../stores/react/store-context';
import { Dialog } from '../ui/Dialog';
import { GuestNoteForm } from './GuestNoteForm';

/**
 * Writing a note about the open ticket's guest: a new freeform one, or — given `note` — rewriting
 * one already on record. Closes once the note is saved, and keeps the draft when saving fails.
 */
export const GuestNoteDialog = observer(function GuestNoteDialog({
	note,
	open,
	store,
	onClose,
}: {
	/** The note to edit; without one, the dialog adds a new freeform note. */
	note?: GuestNoteRecord;
	open: boolean;
	store: GuestNotesStore;
	onClose: () => void;
}) {
	const t = adminTranslations.en.queueDesk.guestNotes;
	const { admin } = useRootStore();
	const isRetired =
		note?.categoryId != null &&
		!admin.noteCategories.offered.some(({ id }) => id === note.categoryId);

	const save = async (revision: GuestNoteRevision) => {
		const saved = note
			? await store.revise(note, revision)
			: await store.add({ kind: 'text', ...revision });

		if (saved) {
			onClose();
		}

		return saved;
	};

	return (
		<Dialog
			open={open}
			title={note ? t.editTitle : t.addTitle}
			closeLabel={t.cancel}
			onClose={onClose}
		>
			<GuestNoteForm
				initial={note ? { body: note.body, categoryId: note.categoryId } : undefined}
				retiredCategory={
					isRetired && note?.categoryLabel
						? { id: note.categoryId!, label: note.categoryLabel }
						: undefined
				}
				label={!note || note.kind === 'text' ? t.note : t.screenshotNotice.entry}
				submitLabel={note ? t.save : t.add}
				busyLabel={note ? t.saving : t.adding}
				busy={note ? store.isSaving(note) : store.isAdding}
				requiresBody={GuestNote.requiresBody(note?.kind ?? 'text')}
				autoFocus
				onSubmit={save}
				onCancel={onClose}
			/>
		</Dialog>
	);
});
