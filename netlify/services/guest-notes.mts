import { and, asc, desc, eq, isNull, ne, sql } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../../db/index.mjs';
import { guestNoteCategories, guestNotes, guests, marketEvents } from '../../db/schema.mjs';
import {
	GuestNote,
	GuestNoteCategory,
	GuestNotePolicy,
	guestNoteKinds,
	type GuestNoteCategoryRecord,
	type GuestNoteRecord,
} from '../../src/models/guest-note.js';
import type { Permission } from '../../src/services/permissions.js';
import { tracedQuery } from '../lib/sentry.mjs';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const bodySchema = z
	.string()
	.trim()
	.max(GuestNote.bodyMaxLength)
	.nullable()
	.default(null)
	.transform((body) => body || null);

const categoryIdSchema = z.uuid().nullable().default(null);

/** What a worker sends to add a note. A freeform note needs words; a structured one does not. */
export const guestNoteDraftSchema = z
	.object({ kind: z.enum(guestNoteKinds), body: bodySchema, categoryId: categoryIdSchema })
	.refine((draft) => !GuestNote.requiresBody(draft.kind) || draft.body !== null);

/** What a worker sends to change a note. Checked against the note's kind once it is read. */
export const guestNoteRevisionSchema = z.object({ body: bodySchema, categoryId: categoryIdSchema });

export const guestNoteCategoryDraftSchema = z.object({
	label: z.string().trim().min(1).max(GuestNoteCategory.labelMaxLength),
});

export const guestNoteCategoryChangeSchema = z
	.object({
		label: z.string().trim().min(1).max(GuestNoteCategory.labelMaxLength).optional(),
		archived: z.boolean().optional(),
	})
	.refine((change) => change.label !== undefined || change.archived !== undefined);

export type GuestNoteResult =
	| { ok: true; note: GuestNoteRecord | null }
	| { ok: false; status: 400 | 403 | 404; error: string };

/** The signed-in worker a request comes from, as the notes endpoints need them. */
export type NoteEditor = {
	actor: { id: string | null; name: string | null };
	permissions: Permission[];
};

const noteColumns = {
	id: guestNotes.id,
	guestId: guestNotes.guestId,
	marketEventId: guestNotes.marketEventId,
	kind: guestNotes.kind,
	body: guestNotes.body,
	categoryId: guestNotes.categoryId,
	categoryLabel: guestNoteCategories.label,
	authorId: guestNotes.authorId,
	authorName: guestNotes.authorName,
	createdAt: guestNotes.createdAt,
	updatedAt: guestNotes.updatedAt,
};

type NoteRow = Omit<GuestNoteRecord, 'createdAt' | 'updatedAt' | 'editable'> & {
	createdAt: Date;
	updatedAt: Date;
};

/** The session that has not ended yet, if there is one — the only one a note can still belong to. */
async function openSessionId(database: typeof db | Transaction): Promise<string | null> {
	const [event] = await database
		.select({ id: marketEvents.id })
		.from(marketEvents)
		.where(ne(marketEvents.status, 'ended'))
		.orderBy(desc(marketEvents.createdAt))
		.limit(1);

	return event?.id ?? null;
}

/**
 * One worker's view of the staff notes: reading a guest's, adding to them, and changing or deleting
 * the ones `GuestNotePolicy` lets them. Built per request, since who may change a note depends on
 * who is asking and which session is open at that moment.
 */
export class GuestNoteBook {
	constructor(private readonly editor: NoteEditor) {}

	/** A guest's notes, oldest first; `null` when there is no such guest. */
	async list(guestId: string): Promise<GuestNoteRecord[] | null> {
		return tracedQuery('guest_notes.list', async () => {
			const [guest] = await db
				.select({ id: guests.id })
				.from(guests)
				.where(eq(guests.id, guestId))
				.limit(1);

			if (!guest) {
				return null;
			}

			const policy = await this.policy(db);
			const rows = await db
				.select(noteColumns)
				.from(guestNotes)
				.leftJoin(guestNoteCategories, eq(guestNoteCategories.id, guestNotes.categoryId))
				.where(eq(guestNotes.guestId, guestId))
				.orderBy(asc(guestNotes.createdAt));

			return rows.map((row) => this.present(row, policy));
		});
	}

	async add(
		guestId: string,
		draft: z.infer<typeof guestNoteDraftSchema>,
	): Promise<GuestNoteResult> {
		return tracedQuery('guest_notes.add', () =>
			db.transaction(async (tx) => {
				const [guest] = await tx
					.select({ id: guests.id })
					.from(guests)
					.where(eq(guests.id, guestId))
					.limit(1);

				if (!guest) {
					return { ok: false, status: 404, error: 'Guest not found.' } as const;
				}

				if (draft.categoryId && !(await this.isOffered(tx, draft.categoryId))) {
					return {
						ok: false,
						status: 400,
						error: 'Choose a category that is still offered.',
					} as const;
				}

				const marketEventId = await openSessionId(tx);
				const [inserted] = await tx
					.insert(guestNotes)
					.values({
						guestId,
						marketEventId,
						kind: draft.kind,
						body: draft.body,
						categoryId: draft.categoryId,
						authorId: this.editor.actor.id,
						authorName: this.editor.actor.name,
					})
					.returning({ id: guestNotes.id });

				return { ok: true, note: await this.read(tx, inserted!.id, marketEventId) } as const;
			}),
		);
	}

	async revise(
		noteId: string,
		revision: z.infer<typeof guestNoteRevisionSchema>,
	): Promise<GuestNoteResult> {
		return tracedQuery('guest_notes.revise', () =>
			db.transaction(async (tx) => {
				const checked = await this.lockModifiable(tx, noteId);

				if (!checked.ok) {
					return checked;
				}

				const { note } = checked;

				if (GuestNote.requiresBody(note.kind) && !revision.body) {
					return { ok: false, status: 400, error: 'A note needs some words.' } as const;
				}

				// A note can keep a category retired since it was filed, but not move to one.
				if (
					revision.categoryId &&
					revision.categoryId !== note.categoryId &&
					!(await this.isOffered(tx, revision.categoryId))
				) {
					return {
						ok: false,
						status: 400,
						error: 'Choose a category that is still offered.',
					} as const;
				}

				await tx
					.update(guestNotes)
					.set({ body: revision.body, categoryId: revision.categoryId, updatedAt: new Date() })
					.where(eq(guestNotes.id, noteId));

				return { ok: true, note: await this.read(tx, noteId, checked.openSessionId) } as const;
			}),
		);
	}

	async remove(noteId: string): Promise<GuestNoteResult> {
		return tracedQuery('guest_notes.remove', () =>
			db.transaction(async (tx) => {
				const checked = await this.lockModifiable(tx, noteId);

				if (!checked.ok) {
					return checked;
				}

				await tx.delete(guestNotes).where(eq(guestNotes.id, noteId));

				return { ok: true, note: null } as const;
			}),
		);
	}

	private async policy(database: typeof db | Transaction, openSession?: string | null) {
		return new GuestNotePolicy(
			{ id: this.editor.actor.id, permissions: this.editor.permissions },
			openSession === undefined ? await openSessionId(database) : openSession,
		);
	}

	/** Reads and locks a note, refusing unless this worker may change it. */
	private async lockModifiable(tx: Transaction, noteId: string) {
		const [note] = await tx
			.select({
				kind: guestNotes.kind,
				categoryId: guestNotes.categoryId,
				authorId: guestNotes.authorId,
				marketEventId: guestNotes.marketEventId,
			})
			.from(guestNotes)
			.where(eq(guestNotes.id, noteId))
			.limit(1)
			.for('update');

		if (!note) {
			return {
				ok: false,
				status: 404,
				error: 'Note not found. It may have been deleted.',
			} as const;
		}

		const openSession = await openSessionId(tx);

		if (!(await this.policy(tx, openSession)).canModify(note)) {
			return {
				ok: false,
				status: 403,
				error: 'Only a team leader can change a note from another worker or an earlier session.',
			} as const;
		}

		return { ok: true, note, openSessionId: openSession } as const;
	}

	private async read(tx: Transaction, noteId: string, openSession: string | null) {
		const [row] = await tx
			.select(noteColumns)
			.from(guestNotes)
			.leftJoin(guestNoteCategories, eq(guestNoteCategories.id, guestNotes.categoryId))
			.where(eq(guestNotes.id, noteId))
			.limit(1);

		return this.present(row!, await this.policy(tx, openSession));
	}

	private async isOffered(tx: Transaction, categoryId: string): Promise<boolean> {
		const [category] = await tx
			.select({ id: guestNoteCategories.id })
			.from(guestNoteCategories)
			.where(and(eq(guestNoteCategories.id, categoryId), isNull(guestNoteCategories.archivedAt)))
			.limit(1);

		return Boolean(category);
	}

	private present(row: NoteRow, policy: GuestNotePolicy): GuestNoteRecord {
		return {
			id: row.id,
			guestId: row.guestId,
			marketEventId: row.marketEventId,
			kind: row.kind,
			body: row.body,
			categoryId: row.categoryId,
			categoryLabel: row.categoryLabel,
			authorId: row.authorId,
			authorName: row.authorName,
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
			editable: policy.canModify(row),
		};
	}
}

export type CategoryResult =
	| { ok: true; category: GuestNoteCategoryRecord }
	| { ok: false; status: 404 | 409; error: string };

const categoryColumns = {
	id: guestNoteCategories.id,
	label: guestNoteCategories.label,
	archivedAt: guestNoteCategories.archivedAt,
};

function presentCategory(row: { id: string; label: string; archivedAt: Date | null }) {
	return { ...row, archivedAt: row.archivedAt?.toISOString() ?? null };
}

/** Postgres's unique-violation code, raised when two offered categories would share a label. */
function isDuplicateLabel(error: unknown): boolean {
	const cause = (error as { cause?: { code?: string } } | null)?.cause ?? error;

	return (cause as { code?: string } | null)?.code === '23505';
}

const duplicateLabel = {
	ok: false,
	status: 409,
	error: 'A category with that name is already offered.',
} as const;

/** The labels notes are filed under. Retiring one keeps it for the notes already filed there. */
export class GuestNoteCategories {
	/** Every category, offered ones first, each group in the order they were added. */
	static async list(): Promise<GuestNoteCategoryRecord[]> {
		const rows = await tracedQuery('guest_note_categories.list', () =>
			db
				.select(categoryColumns)
				.from(guestNoteCategories)
				.orderBy(
					sql`${guestNoteCategories.archivedAt} IS NOT NULL`,
					asc(guestNoteCategories.createdAt),
				),
		);

		return rows.map(presentCategory);
	}

	static async add(label: string): Promise<CategoryResult> {
		try {
			const [row] = await tracedQuery('guest_note_categories.add', () =>
				db.insert(guestNoteCategories).values({ label }).returning(categoryColumns),
			);

			return { ok: true, category: presentCategory(row!) };
		} catch (error) {
			if (isDuplicateLabel(error)) {
				return duplicateLabel;
			}

			throw error;
		}
	}

	static async change(
		id: string,
		change: z.infer<typeof guestNoteCategoryChangeSchema>,
	): Promise<CategoryResult> {
		try {
			const [row] = await tracedQuery('guest_note_categories.change', () =>
				db
					.update(guestNoteCategories)
					.set({
						...(change.label === undefined ? {} : { label: change.label }),
						...(change.archived === undefined
							? {}
							: { archivedAt: change.archived ? new Date() : null }),
					})
					.where(eq(guestNoteCategories.id, id))
					.returning(categoryColumns),
			);

			return row
				? { ok: true, category: presentCategory(row) }
				: { ok: false, status: 404, error: 'Category not found.' };
		} catch (error) {
			if (isDuplicateLabel(error)) {
				return duplicateLabel;
			}

			throw error;
		}
	}
}
