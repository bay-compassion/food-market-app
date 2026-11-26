import styled from '@emotion/styled';
import { Button, TextField } from '@mui/material';
import { observer } from 'mobx-react-lite';
import { useEffect, useState, type FormEvent } from 'react';

import { adminTranslations } from '../../adminLocales';
import { GuestNoteCategory } from '../../models/guest-note';
import { useRootStore } from '../../stores/react/store-context';
import { NoteCategoryRow } from './NoteCategoryRow';

const Card = styled.section`
	display: grid;
	gap: 18px;

	h3 {
		margin: 0 0 6px;
		font-family: var(--font-heading);
		text-transform: uppercase;
	}

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.category-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 8px;
		min-height: 48px;
		border-top: 1px solid var(--color-border-soft);
	}

	li:first-of-type > .category-row,
	li.category-row:first-of-type {
		border-top: 0;
	}

	.label {
		flex: 1 1 auto;
		font-weight: 600;
	}

	.add {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
	}

	.help {
		margin: 0;
		color: var(--color-text-subtle);
		font-size: 14px;
	}
`;

/**
 * The categories staff can file a note about a guest under, and adding, renaming, retiring or
 * restoring them. Retiring keeps the label on notes already filed there; it is never a delete.
 */
export const NoteCategoriesView = observer(function NoteCategoriesView() {
	const t = adminTranslations.en.noteCategories;
	const categories = useRootStore().admin.noteCategories;
	const [label, setLabel] = useState('');

	useEffect(() => {
		void categories.reload();
	}, [categories]);

	const add = async (event: FormEvent) => {
		event.preventDefault();

		if (await categories.add(label)) {
			setLabel('');
		}
	};

	if (categories.loadFailed) {
		return <p className="admin-section">{t.loadFailed}</p>;
	}

	return (
		<Card className="admin-section settings-card">
			<form className="add" aria-label={t.add} onSubmit={add}>
				<TextField
					label={t.newCategory}
					value={label}
					onChange={(event) => setLabel(event.target.value)}
					slotProps={{ htmlInput: { maxLength: GuestNoteCategory.labelMaxLength } }}
					size="small"
				/>
				<Button type="submit" disabled={!label.trim() || categories.busy}>
					{t.add}
				</Button>
			</form>
			<div>
				<h3>{t.offered}</h3>
				{categories.offered.length ? (
					<ul aria-label={t.offered}>
						{categories.offered.map((category) => (
							<NoteCategoryRow key={category.id} category={category} />
						))}
					</ul>
				) : (
					<p className="help">{categories.isLoaded ? t.empty : null}</p>
				)}
			</div>
			{categories.retired.length ? (
				<div>
					<h3>{t.retired}</h3>
					<p className="help">{t.retireHelp}</p>
					<ul aria-label={t.retired}>
						{categories.retired.map((category) => (
							<NoteCategoryRow key={category.id} category={category} />
						))}
					</ul>
				</div>
			) : (
				<p className="help">{t.retireHelp}</p>
			)}
		</Card>
	);
});
