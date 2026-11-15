import { runInAction } from 'mobx';

import { adminTranslations } from '../adminLocales.ts';
import { AdminRequestError, type AdminApi } from '../services/admin-api.ts';
import { makeReactive } from '../services/make-reactive.ts';
import type { SessionDeletionPreview } from '../services/session-deletion.ts';
import type { NotificationStore } from './notification.store.ts';

export type SessionDeletionApi = Pick<AdminApi, 'previewSessionDeletion' | 'deleteSession'>;

/**
 * Permanently deleting a finished session that was run as a test: the preview the dialog shows,
 * and the deletion itself. Its own store rather than more of `AdminStore`, which only hands it the
 * API and is told, through `onDeleted`, to reread the history it no longer belongs in.
 */
export class SessionDeletionStore {
	private _preview: SessionDeletionPreview | null = null;
	private _isDeleting = false;

	constructor(
		private readonly api: SessionDeletionApi,
		private readonly notifications: NotificationStore,
		private readonly onDeleted: () => Promise<void>,
	) {
		makeReactive(this, { api: false, notifications: false, onDeleted: false });
	}

	/** What deleting the open session would remove; `null` while the dialog is closed. */
	get preview(): SessionDeletionPreview | null {
		return this._preview;
	}

	get isDeleting(): boolean {
		return this._isDeleting;
	}

	/** Opens the dialog with a preview read fresh from the server. */
	async open(marketEventId: string): Promise<void> {
		try {
			const preview = await this.api.previewSessionDeletion(marketEventId);

			runInAction(() => (this._preview = preview));
		} catch (error) {
			this.notifications.error(this.failure(error));
		}
	}

	dismiss(): void {
		this._preview = null;
	}

	/**
	 * Deletes the session the dialog is open for. `confirmation` is what the steward typed; the
	 * server refuses unless it is the session's date and start time. `force` also removes the
	 * warehouse snapshots covering it. Resolves to whether it was deleted.
	 */
	async delete(confirmation: string, options: { force?: boolean } = {}): Promise<boolean> {
		const preview = this._preview;

		if (!preview || this._isDeleting) {
			return false;
		}

		this._isDeleting = true;

		try {
			await this.api.deleteSession(preview.marketEventId, confirmation, options);
			runInAction(() => (this._preview = null));
			this.notifications.success(adminTranslations.en.sessionDeletion.deleted);
		} catch (error) {
			this.notifications.error(this.failure(error));

			return false;
		} finally {
			runInAction(() => (this._isDeleting = false));
		}

		// The deletion has landed; a failed reread must not report it as failed and invite a retry.
		await this.onDeleted().catch(() => {});

		return true;
	}

	private failure(error: unknown): string {
		return error instanceof AdminRequestError && error.reason
			? error.reason
			: adminTranslations.en.sessionDeletion.failed;
	}
}
