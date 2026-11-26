import { describe, expect, it, vi } from 'vitest';

import type { GuestNoteDraft, GuestNoteRecord } from '../models/guest-note';
import { AdminRequestError } from '../services/admin-api';
import { GuestNotesStore } from './guest-notes.store';
import { NotificationStore } from './notification.store';

function record(overrides: Partial<GuestNoteRecord> = {}): GuestNoteRecord {
	return {
		id: 'note-1',
		guestId: 'guest-1',
		marketEventId: 'session-1',
		kind: 'text',
		body: 'Uses a cane.',
		categoryId: null,
		categoryLabel: null,
		authorId: 'auth0|lee',
		authorName: 'Lee',
		createdAt: '2026-11-26T17:00:00.000Z',
		updatedAt: '2026-11-26T17:00:00.000Z',
		editable: true,
		...overrides,
	};
}

function storeWith(notes: GuestNoteRecord[] = [record()]) {
	const api = {
		listGuestNotes: vi.fn().mockResolvedValue(notes),
		addGuestNote: vi.fn(async (_guestId: string, draft: GuestNoteDraft) =>
			record({ ...draft, id: 'note-new', createdAt: '2026-11-26T18:00:00.000Z' }),
		),
		reviseGuestNote: vi.fn(async (noteId: string, revision: { body: string | null }) =>
			record({ id: noteId, ...revision }),
		),
		deleteGuestNote: vi.fn().mockResolvedValue(undefined),
	};
	const notifications = new NotificationStore();

	return { api, notifications, store: new GuestNotesStore('guest-1', api, notifications) };
}

describe('GuestNotesStore', () => {
	it('loads a guest’s notes', async () => {
		// Arrange
		const { store, api } = storeWith();

		// Act
		await store.load();

		// Assert
		expect(api.listGuestNotes).toHaveBeenCalledWith('guest-1');
		expect(store.notes?.newestFirst.map(({ id }) => id)).toEqual(['note-1']);
	});

	it('records a screenshot notice as its own note, raising the count', async () => {
		// Arrange
		const { store, api, notifications } = storeWith();

		await store.load();

		// Act
		const added = await store.recordScreenshotNotice();

		// Assert
		expect(added).toBe(true);
		expect(api.addGuestNote).toHaveBeenCalledWith('guest-1', {
			kind: 'screenshot_notice',
			body: null,
			categoryId: null,
		});
		expect(store.notes?.screenshotNoticeCount).toBe(1);
		expect(notifications.pending.at(-1)).toMatchObject({ severity: 'success' });
	});

	it('replaces a revised note and drops a deleted one', async () => {
		// Arrange
		const { store } = storeWith([record(), record({ id: 'note-2' })]);

		await store.load();
		const [first, second] = store.notes!.newestFirst;

		// Act
		await store.revise(first!, { body: 'Uses a walker.', categoryId: null });
		await store.remove(second!);

		// Assert
		expect(store.notes?.newestFirst.map(({ body }) => body)).toEqual(['Uses a walker.']);
	});

	it('shows the server’s reason when it refuses a change', async () => {
		// Arrange
		const { store, api, notifications } = storeWith();

		await store.load();
		api.reviseGuestNote.mockRejectedValueOnce(
			new AdminRequestError('guest_note', 'Only a team leader can change this note.'),
		);

		// Act
		const saved = await store.revise(store.notes!.newestFirst[0]!, {
			body: 'Changed',
			categoryId: null,
		});

		// Assert
		expect(saved).toBe(false);
		expect(store.notes?.newestFirst[0]?.body).toBe('Uses a cane.');
		expect(notifications.pending.at(-1)).toMatchObject({
			severity: 'error',
			message: 'Only a team leader can change this note.',
		});
	});
});
