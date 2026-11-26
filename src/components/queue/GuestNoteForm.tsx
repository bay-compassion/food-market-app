import styled from '@emotion/styled';
import { TextField } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useState, type FormEvent } from 'react';

import { adminTranslations } from '../../adminLocales';
import { GuestNote, type GuestNoteRevision } from '../../models/guest-note';
import { useRootStore } from '../../stores/react/store-context';

const Form = styled.form`
	display: grid;
	gap: 10px;

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	button {
		min-height: 44px;
		padding: 0 18px;
		border: 1.5px solid var(--color-border);
		border-radius: var(--radius-pill);
		color: var(--color-text);
		background: var(--color-background);
		font-size: 15px;
		font-weight: 700;
	}

	button:disabled {
		opacity: 0.6;
	}
`;

/**
 * Writing a note, or rewriting one: its words and, optionally, a category. Adding a note and
 * editing one are the same form; editing passes the note's current values and a way to cancel.
 *
 * A category retired since the note was filed stays selectable for that note alone, so saving an
 * edit never quietly unfiles it.
 */
export const GuestNoteForm = observer(function GuestNoteForm({
	initial = { body: '', categoryId: null },
	retiredCategory,
	label,
	submitLabel,
	busyLabel,
	busy,
	requiresBody = true,
	autoFocus = false,
	onSubmit,
	onCancel,
}: {
	initial?: GuestNoteRevision;
	/** The note's own category when it has been retired since. */
	retiredCategory?: { id: string; label: string };
	label: string;
	submitLabel: string;
	busyLabel: string;
	busy: boolean;
	requiresBody?: boolean;
	/** Puts the cursor in the note, for a form that opens on its own, as the add dialog does. */
	autoFocus?: boolean;
	/** Resolves to whether it saved; the form clears itself when it did and nothing is cancelled. */
	onSubmit: (revision: GuestNoteRevision) => Promise<boolean>;
	onCancel?: () => void;
}) {
	const t = adminTranslations.en.queueDesk.guestNotes;
	const categories = useRootStore().admin.noteCategories;
	const [body, setBody] = useState(initial.body ?? '');
	const [categoryId, setCategoryId] = useState(initial.categoryId ?? '');
	const choices = retiredCategory ? [...categories.offered, retiredCategory] : categories.offered;
	const isEmpty = requiresBody && !body.trim();

	const submit = async (event: FormEvent) => {
		event.preventDefault();

		const saved = await onSubmit({ body: body.trim() || null, categoryId: categoryId || null });

		if (saved && !onCancel) {
			setBody('');
			setCategoryId('');
		}
	};

	return (
		<Form aria-label={label} onSubmit={submit}>
			<TextField
				label={label}
				value={body}
				onChange={(event) => setBody(event.target.value)}
				slotProps={{ htmlInput: { maxLength: GuestNote.bodyMaxLength } }}
				multiline
				minRows={3}
				autoFocus={autoFocus}
			/>
			<TextField
				select
				// Native, as the app's other selects are: the theme's field height applies, and a phone
				// opens its own picker.
				slotProps={{ select: { native: true } }}
				label={t.category}
				value={categoryId}
				onChange={(event) => setCategoryId(event.target.value)}
			>
				<option value="">{t.noCategory}</option>
				{choices.map((category) => (
					<option key={category.id} value={category.id}>
						{category.label}
					</option>
				))}
			</TextField>
			<div className="actions">
				<button type="submit" disabled={isEmpty || busy}>
					{busy ? busyLabel : submitLabel}
				</button>
				{onCancel ? (
					<button type="button" onClick={onCancel}>
						{t.cancel}
					</button>
				) : null}
			</div>
		</Form>
	);
});
