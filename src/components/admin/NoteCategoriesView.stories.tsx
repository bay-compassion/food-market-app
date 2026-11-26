import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { adminTranslations } from '../../adminLocales';
import type { GuestNoteCategoryRecord } from '../../models/guest-note';
import type { AdminApi } from '../../services/admin-api';
import { RootStoreProvider } from '../../stores/react/store-context';
import { RootStore } from '../../stores/root.store';
import { NotificationToasts } from '../ui/NotificationToasts';
import { NoteCategoriesView } from './NoteCategoriesView';

const t = adminTranslations.en.noteCategories;

/** A store whose API keeps the categories in memory, starting from the migration's three. */
function seededStore(): RootStore {
	let categories: GuestNoteCategoryRecord[] = [
		{ id: 'warning', label: 'Warning', archivedAt: null },
		{ id: 'escalate', label: 'Escalate to Lead', archivedAt: null },
		{ id: 'accommodation', label: 'Accommodation', archivedAt: null },
		{ id: 'old', label: 'Needs Interpreter', archivedAt: '2026-10-01T17:00:00.000Z' },
	];
	const api = {
		listGuestNoteCategories: async () => categories,
		addGuestNoteCategory: async (label: string) => {
			const category = { id: `category-${categories.length + 1}`, label, archivedAt: null };

			categories = [...categories, category];

			return category;
		},
		changeGuestNoteCategory: async (id: string, change: { label?: string; archived?: boolean }) => {
			const existing = categories.find((category) => category.id === id)!;
			const changed = {
				...existing,
				label: change.label ?? existing.label,
				archivedAt:
					change.archived === undefined
						? existing.archivedAt
						: change.archived
							? new Date().toISOString()
							: null,
			};

			categories = categories.map((category) => (category.id === id ? changed : category));

			return changed;
		},
	} as unknown as AdminApi;

	return new RootStore({ admin: { api } });
}

function SeededNoteCategories() {
	const [store] = useState(seededStore);

	return (
		<RootStoreProvider store={store}>
			<NoteCategoriesView />
			{/* The decorator's toasts read its own store, not this seeded one. */}
			<NotificationToasts />
		</RootStoreProvider>
	);
}

/**
 * Where an admin or team leader adds the categories staff notes are filed under, renames them, and
 * retires one that is no longer wanted — which keeps its name on the notes already filed there.
 */
const meta = {
	title: 'Admin/Note Categories/Note Categories',
	component: SeededNoteCategories,
	parameters: { shell: 'admin' },
} satisfies Meta<typeof SeededNoteCategories>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Categories: Story = {
	play: async ({ canvas }) => {
		const offered = within(await canvas.findByRole('list', { name: t.offered }));

		await expect(offered.getByText('Escalate to Lead')).toBeVisible();
		await expect(
			within(canvas.getByRole('list', { name: t.retired })).getByText('Needs Interpreter'),
		).toBeVisible();
	},
};

export const AddingAndRetiring: Story = {
	play: async ({ canvas }) => {
		await canvas.findByRole('list', { name: t.offered });
		await userEvent.type(canvas.getByRole('textbox', { name: t.newCategory }), 'Mobility');
		await userEvent.click(canvas.getByRole('button', { name: t.add }));

		const offered = within(canvas.getByRole('list', { name: t.offered }));

		await expect(await offered.findByText('Mobility')).toBeVisible();

		const warning = offered.getByText('Warning').closest('li')!;

		await userEvent.click(within(warning).getByRole('button', { name: t.retire }));

		await expect(
			await within(canvas.getByRole('list', { name: t.retired })).findByText('Warning'),
		).toBeVisible();
	},
};
