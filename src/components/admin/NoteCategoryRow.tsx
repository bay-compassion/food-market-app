import { Button, TextField } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useState, type FormEvent } from 'react';

import { adminTranslations } from '../../adminLocales';
import { GuestNoteCategory, type GuestNoteCategoryRecord } from '../../models/guest-note';
import { useRootStore } from '../../stores/react/store-context';

/** One category: its name, renamed in place, and retiring it or bringing it back. */
export const NoteCategoryRow = observer(function NoteCategoryRow({
	category,
}: {
	category: GuestNoteCategoryRecord;
}) {
	const t = adminTranslations.en.noteCategories;
	const categories = useRootStore().admin.noteCategories;
	const [draft, setDraft] = useState<string | null>(null);

	const rename = async (event: FormEvent) => {
		event.preventDefault();

		if (draft !== null && (await categories.rename(category, draft))) {
			setDraft(null);
		}
	};

	if (draft !== null) {
		return (
			<li>
				<form className="category-row" aria-label={t.rename} onSubmit={rename}>
					<TextField
						label={t.rename}
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						slotProps={{ htmlInput: { maxLength: GuestNoteCategory.labelMaxLength } }}
						size="small"
						autoFocus
					/>
					<Button type="submit" disabled={!draft.trim() || categories.busy}>
						{t.save}
					</Button>
					<Button onClick={() => setDraft(null)}>{t.cancel}</Button>
				</form>
			</li>
		);
	}

	return (
		<li className="category-row">
			<span className="label">{category.label}</span>
			{category.archivedAt ? (
				<Button disabled={categories.busy} onClick={() => void categories.restore(category)}>
					{t.restore}
				</Button>
			) : (
				<>
					<Button disabled={categories.busy} onClick={() => setDraft(category.label)}>
						{t.rename}
					</Button>
					<Button
						color="error"
						disabled={categories.busy}
						onClick={() => void categories.retire(category)}
					>
						{t.retire}
					</Button>
				</>
			)}
		</li>
	);
});
