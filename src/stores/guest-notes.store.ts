import { runInAction } from 'mobx';

import { adminTranslations } from '../adminLocales.ts';
import {
	GuestNotes,
	type GuestNoteDraft,
	type GuestNoteRecord,
	type GuestNoteRevision,
} from '../models/guest-note.ts';
import { AdminRequestError, type AdminApi } from '../services/admin-api.ts';
import { makeReactive } from '../services/make-reactive.ts';
import type { NotificationStore } from './notification.store.ts';

export type GuestNotesApi = Pick<
	AdminApi,
	'listGuestNotes' | 'addGuestNote' | 'reviseGuestNote' | 'deleteGuestNote'
>;

/**
 * One guest's staff notes, for as long as their ticket is open: reading them, adding one, and
 * changing or deleting the ones the server marked `editable`. Built per ticket, like the household
 * recorder, because the list is read when the ticket opens rather than polled with the line.
 */
export class GuestNotesStore {
	private _records: GuestNoteRecord[] | null = null;
	private _loadFailed = false;
	private _isAdding = false;
	private _savingNoteId: string | null = null;

	constructor(
		readonly guestId: string,
		private readonly api: GuestNotesApi,
		private readonly notifications: NotificationStore,
	) {
		makeReactive(this, { api: false, notifications: false });
	}

	/** The notes, or `null` until they have loaded. */
	get notes(): GuestNotes | null {
		return this._records ? new GuestNotes(this._records) : null;
	}

	get loadFailed(): boolean {
		return this._loadFailed;
	}

	get isAdding(): boolean {
		return this._isAdding;
	}

	isSaving(note: GuestNoteRecord): boolean {
		return this._savingNoteId === note.id;
	}

	async load(): Promise<void> {
		try {
			const records = await this.api.listGuestNotes(this.guestId);

			runInAction(() => {
				this._records = records;
				this._loadFailed = false;
			});
		} catch {
			runInAction(() => (this._loadFailed = true));
		}
	}

	/** Adds a note. Resolves to whether it worked, so the form can keep its draft when it did not. */
	async add(draft: GuestNoteDraft): Promise<boolean> {
		const t = adminTranslations.en.queueDesk.guestNotes;

		if (this._isAdding) {
			return false;
		}

		this._isAdding = true;

		try {
			const note = await this.api.addGuestNote(this.guestId, draft);

			runInAction(() => {
				this._records = [...(this._records ?? []), note];
				this.notifications.success(
					draft.kind === 'screenshot_notice' ? t.screenshotNotice.recorded : t.added,
				);
			});

			return true;
		} catch (error) {
			runInAction(() => this.notifications.error(reasonOf(error) ?? t.addFailed));

			return false;
		} finally {
			runInAction(() => (this._isAdding = false));
		}
	}

	/** One tap: the guest was told a screenshot of the app is not accepted. */
	async recordScreenshotNotice(): Promise<boolean> {
		return this.add({ kind: 'screenshot_notice', body: null, categoryId: null });
	}

	async revise(note: GuestNoteRecord, revision: GuestNoteRevision): Promise<boolean> {
		const t = adminTranslations.en.queueDesk.guestNotes;

		this._savingNoteId = note.id;

		try {
			const revised = await this.api.reviseGuestNote(note.id, revision);

			runInAction(() => {
				this.replace(note.id, revised);
				this.notifications.success(t.saved);
			});

			return true;
		} catch (error) {
			runInAction(() => this.notifications.error(reasonOf(error) ?? t.saveFailed));

			return false;
		} finally {
			runInAction(() => (this._savingNoteId = null));
		}
	}

	async remove(note: GuestNoteRecord): Promise<boolean> {
		const t = adminTranslations.en.queueDesk.guestNotes;

		this._savingNoteId = note.id;

		try {
			await this.api.deleteGuestNote(note.id);

			runInAction(() => {
				this.replace(note.id, null);
				this.notifications.success(t.deleted);
			});

			return true;
		} catch (error) {
			runInAction(() => this.notifications.error(reasonOf(error) ?? t.deleteFailed));

			return false;
		} finally {
			runInAction(() => (this._savingNoteId = null));
		}
	}

	private replace(noteId: string, next: GuestNoteRecord | null): void {
		this._records = (this._records ?? []).flatMap((record) =>
			record.id === noteId ? (next ? [next] : []) : [record],
		);
	}
}

function reasonOf(error: unknown): string | null {
	return error instanceof AdminRequestError ? error.reason : null;
}
