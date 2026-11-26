import type { Permission } from '../services/permissions.ts';

/**
 * What a note records. `text` is freeform. Every other kind is a structured annotation the desk
 * offers as one tap, counted rather than read: `screenshot_notice` is the guest being told that a
 * screenshot of the app is not accepted in place of the app itself.
 */
export const guestNoteKinds = ['text', 'screenshot_notice'] as const;

export type GuestNoteKind = (typeof guestNoteKinds)[number];

export function isGuestNoteKind(value: unknown): value is GuestNoteKind {
	return guestNoteKinds.includes(value as GuestNoteKind);
}

/** A note as the admin API returns it. Timestamps are ISO strings. */
export type GuestNoteRecord = {
	id: string;
	guestId: string;
	/** The session open when the note was written; null for one written between sessions. */
	marketEventId: string | null;
	kind: GuestNoteKind;
	body: string | null;
	categoryId: string | null;
	/** The category's label, kept even after the category is retired. */
	categoryLabel: string | null;
	authorId: string | null;
	authorName: string | null;
	createdAt: string;
	updatedAt: string;
	/** Whether the caller may change or delete this note — `GuestNotePolicy`'s answer, from the server. */
	editable: boolean;
};

/** What a worker sends to add a note. */
export type GuestNoteDraft = {
	kind: GuestNoteKind;
	body: string | null;
	categoryId: string | null;
};

/** What a worker sends to change a note. A note's kind never changes. */
export type GuestNoteRevision = { body: string | null; categoryId: string | null };

/** One note's rules, shared by the server's validation and the desk's form. */
export class GuestNote {
	/** Matches the `guest_notes_body_check` constraint. */
	static readonly bodyMaxLength = 2_000;

	/** Whether a note of this kind needs words to mean anything. Only freeform notes do. */
	static requiresBody(kind: GuestNoteKind): boolean {
		return kind === 'text';
	}
}

/**
 * Who may change or delete a note, as seen by one signed-in worker while one session is open.
 *
 * Anyone running the queue may add a note at any time. Changing one afterwards is narrower: its
 * author may, while the session it was written in is still open. Once that session ends — and for
 * a note that never belonged to one, like those carried over from the old single staff note — only
 * a holder of `manage:guest-notes` can. The server decides with this class; the desk only reads
 * the `editable` flag it returns.
 */
export class GuestNotePolicy {
	constructor(
		private readonly editor: { id: string | null; permissions: readonly Permission[] },
		/** The session that has not ended yet, if there is one. */
		private readonly openSessionId: string | null,
	) {}

	/** Whether this worker may change any note, past sessions included. */
	get managesAllNotes(): boolean {
		return this.editor.permissions.includes('manage:guest-notes');
	}

	canModify(note: Pick<GuestNoteRecord, 'authorId' | 'marketEventId'>): boolean {
		if (this.managesAllNotes) {
			return true;
		}

		return (
			this.editor.id !== null &&
			note.authorId === this.editor.id &&
			this.openSessionId !== null &&
			note.marketEventId === this.openSessionId
		);
	}
}

/** A guest's notes, newest first, as the ticket reads them. */
export class GuestNotes {
	constructor(private readonly records: readonly GuestNoteRecord[]) {}

	get newestFirst(): GuestNoteRecord[] {
		return [...this.records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
	}

	get isEmpty(): boolean {
		return this.records.length === 0;
	}

	/** Whether any note is one this worker cannot change, which the ticket explains once. */
	get hasLockedNotes(): boolean {
		return this.records.some((note) => !note.editable);
	}

	/** How many times the guest has been told screenshots are not accepted. */
	get screenshotNoticeCount(): number {
		return this.records.filter((note) => note.kind === 'screenshot_notice').length;
	}
}

/** A label a note can be filed under, as the admin API returns it. */
export type GuestNoteCategoryRecord = {
	id: string;
	label: string;
	/** When an admin retired it, as an ISO timestamp; null while it is offered. */
	archivedAt: string | null;
};

export class GuestNoteCategory {
	/** Matches the `guest_note_categories_label_check` constraint. */
	static readonly labelMaxLength = 40;
}
