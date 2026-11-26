import { describe, expect, it, vi } from 'vitest';

import { adminTranslations } from '../adminLocales.ts';
import { AdminRequestError } from '../services/admin-api.ts';
import type { SessionDeletionPreview } from '../services/session-deletion.ts';
import { NotificationStore } from './notification.store.ts';
import { SessionDeletionStore, type SessionDeletionApi } from './session-deletion.store.ts';

const t = adminTranslations.en.sessionDeletion;

const preview: SessionDeletionPreview = {
	marketEventId: 'event-1',
	registrationOpensAt: '2026-11-14T17:30:00.000Z',
	registrationClosesAt: '2026-11-14T17:45:00.000Z',
	confirmation: '2026-11-14 09:30',
	blockedBy: null,
	coveringSnapshots: [],
	sessionOnlyGuests: [{ guestId: 'guest-1', firstName: 'Tess', lastName: 'Tester' }],
	keptGuests: 0,
	rows: {
		household_service_entries: 0,
		visits: 1,
		visit_events: 3,
		notification_deliveries: 1,
		push_subscriptions: 0,
		guests: 1,
		registration_questions: 0,
		lottery_odds_changes: 0,
		guest_notes: 0,
	},
};

function setup(api: Partial<SessionDeletionApi> = {}) {
	const notifications = new NotificationStore();
	const onDeleted = vi.fn(async () => {});
	const store = new SessionDeletionStore(
		{
			previewSessionDeletion: vi.fn(async () => preview),
			deleteSession: vi.fn(async () => {}),
			...api,
		},
		notifications,
		onDeleted,
	);

	return { store, notifications, onDeleted };
}

describe('SessionDeletionStore', () => {
	it('opens with the preview the server reports', async () => {
		// Arrange
		const { store } = setup();

		// Act
		await store.open('event-1');

		// Assert
		expect(store.preview).toEqual(preview);
	});

	it('deletes the open session with the typed confirmation, closes, and rereads the history', async () => {
		// Arrange
		const deleteSession = vi.fn(async () => {});
		const { store, notifications, onDeleted } = setup({ deleteSession });

		await store.open('event-1');

		// Act
		const deleted = await store.delete('2026-11-14 09:30');

		// Assert
		expect(deleted).toBe(true);
		expect(deleteSession).toHaveBeenCalledWith('event-1', '2026-11-14 09:30', {});
		expect(store.preview).toBeNull();
		expect(onDeleted).toHaveBeenCalledOnce();
		expect(notifications.pending).toMatchObject([{ message: t.deleted, severity: 'success' }]);
	});

	it('passes a forced deletion through to the server', async () => {
		// Arrange
		const deleteSession = vi.fn(async () => {});
		const { store } = setup({ deleteSession });

		await store.open('event-1');

		// Act
		await store.delete('2026-11-14 09:30', { force: true });

		// Assert
		expect(deleteSession).toHaveBeenCalledWith('event-1', '2026-11-14 09:30', { force: true });
	});

	it('stays open and shows the server’s reason when it refuses', async () => {
		// Arrange
		const reason = 'That is not this session’s date and start time. Nothing was deleted.';
		const { store, notifications, onDeleted } = setup({
			deleteSession: vi.fn(async () => {
				throw new AdminRequestError('session_deletion', reason);
			}),
		});

		await store.open('event-1');

		// Act
		const deleted = await store.delete('2026-11-14 14:00');

		// Assert
		expect(deleted).toBe(false);
		expect(store.preview).toEqual(preview);
		expect(store.isDeleting).toBe(false);
		expect(onDeleted).not.toHaveBeenCalled();
		expect(notifications.pending).toMatchObject([{ message: reason, severity: 'error' }]);
	});

	it('reports a deletion that landed even when rereading the history fails', async () => {
		// Arrange
		const { store, notifications, onDeleted } = setup();

		onDeleted.mockRejectedValueOnce(new Error('offline'));
		await store.open('event-1');

		// Act
		const deleted = await store.delete('2026-11-14 09:30');

		// Assert
		expect(deleted).toBe(true);
		expect(notifications.pending).toMatchObject([{ severity: 'success' }]);
	});

	it('raises a toast and stays closed when the preview cannot be read', async () => {
		// Arrange
		const { store, notifications } = setup({
			previewSessionDeletion: vi.fn(async () => {
				throw new Error('offline');
			}),
		});

		// Act
		await store.open('event-1');

		// Assert
		expect(store.preview).toBeNull();
		expect(notifications.pending).toMatchObject([{ message: t.failed, severity: 'error' }]);
	});
});
