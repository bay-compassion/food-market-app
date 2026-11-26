import { runInAction } from 'mobx';

import { adminTranslations } from '../adminLocales.ts';
import type { GuestNoteCategoryRecord } from '../models/guest-note.ts';
import { AdminRequestError, type AdminApi } from '../services/admin-api.ts';
import { makeReactive } from '../services/make-reactive.ts';
import type { NotificationStore } from './notification.store.ts';

export type GuestNoteCategoriesApi = Pick<
	AdminApi,
	'listGuestNoteCategories' | 'addGuestNoteCategory' | 'changeGuestNoteCategory'
>;

/**
 * The categories a staff note can be filed under. One instance for the dashboard, read once and
 * shared by every ticket's note form and the Note Categories screen, which changes it.
 */
export class GuestNoteCategoriesStore {
	private _categories: GuestNoteCategoryRecord[] | null = null;
	private _loadFailed = false;
	private _busy = false;
	private _loading: Promise<void> | null = null;

	constructor(
		private readonly api: GuestNoteCategoriesApi,
		private readonly notifications: NotificationStore,
	) {
		makeReactive(this, { api: false, notifications: false, _loading: false });
	}

	get isLoaded(): boolean {
		return this._categories !== null;
	}

	get loadFailed(): boolean {
		return this._loadFailed;
	}

	get busy(): boolean {
		return this._busy;
	}

	/** The categories a new note can be filed under, in the order they were added. */
	get offered(): GuestNoteCategoryRecord[] {
		return (this._categories ?? []).filter((category) => !category.archivedAt);
	}

	get retired(): GuestNoteCategoryRecord[] {
		return (this._categories ?? []).filter((category) => category.archivedAt);
	}

	/** Reads the categories once; later calls share the first read. `reload` forces another. */
	ensureLoaded(): Promise<void> {
		this._loading ??= this.reload();

		return this._loading;
	}

	async reload(): Promise<void> {
		try {
			const categories = await this.api.listGuestNoteCategories();

			runInAction(() => {
				this._categories = categories;
				this._loadFailed = false;
			});
		} catch {
			runInAction(() => {
				this._loadFailed = true;
				this._loading = null;
			});
		}
	}

	async add(label: string): Promise<boolean> {
		const t = adminTranslations.en.noteCategories;

		return this.run(
			() => this.api.addGuestNoteCategory(label.trim()),
			(category) => [...(this._categories ?? []), category],
			t.added,
		);
	}

	async rename(category: GuestNoteCategoryRecord, label: string): Promise<boolean> {
		return this.change(category, { label: label.trim() });
	}

	async retire(category: GuestNoteCategoryRecord): Promise<boolean> {
		return this.change(category, { archived: true });
	}

	async restore(category: GuestNoteCategoryRecord): Promise<boolean> {
		return this.change(category, { archived: false });
	}

	private async change(
		category: GuestNoteCategoryRecord,
		change: { label?: string; archived?: boolean },
	): Promise<boolean> {
		return this.run(
			() => this.api.changeGuestNoteCategory(category.id, change),
			(changed) =>
				(this._categories ?? []).map((existing) =>
					existing.id === changed.id ? changed : existing,
				),
			adminTranslations.en.noteCategories.saved,
		);
	}

	private async run(
		request: () => Promise<GuestNoteCategoryRecord>,
		apply: (category: GuestNoteCategoryRecord) => GuestNoteCategoryRecord[],
		success: string,
	): Promise<boolean> {
		this._busy = true;

		try {
			const category = await request();

			runInAction(() => {
				this._categories = apply(category);
				this.notifications.success(success);
			});

			return true;
		} catch (error) {
			runInAction(() =>
				this.notifications.error(
					(error instanceof AdminRequestError ? error.reason : null) ??
						adminTranslations.en.noteCategories.saveFailed,
				),
			);

			return false;
		} finally {
			runInAction(() => (this._busy = false));
		}
	}
}
