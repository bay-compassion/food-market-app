import { describe, expect, it, vi } from 'vitest';

import { adminTranslations } from '../adminLocales.ts';
import { AdminRequestError, type AdminGuest } from '../services/admin-api.ts';
import type { VisitEvent } from '../services/visit-events.ts';
import { NotificationStore } from './notification.store.ts';
import {
	SessionParticipantsStore,
	type SessionParticipantsApi,
} from './session-participants.store.ts';

const t = adminTranslations.en.participants;

const guest: AdminGuest = {
	id: 'visit-1',
	guestId: 'guest-1',
	marketEventId: 'event-1',
	firstName: 'Ana',
	lastName: 'Reyes',
	pronunciation: null,
	staffNotes: null,
	phone: '5105550123',
	householdSize: 3,
	locale: 'en',
	queuePosition: 4,
	priorityNumber: null,
	queueFront: false,
	queueOrder: null,
	calledAt: null,
	status: 'no_show',
};

const correction: VisitEvent = {
	id: 'event-a',
	kind: 'corrected',
	toStatus: 'served',
	actor: { kind: 'worker', id: 'auth0|lee', name: 'Lee' },
	details: { fromStatus: 'no_show' },
	createdAt: '2026-11-16T18:00:00.000Z',
};

function setup(api: Partial<SessionParticipantsApi> = {}) {
	const notifications = new NotificationStore();
	const correctVisitStatus = vi.fn(async () => {});
	const listVisitEvents = vi.fn(async (): Promise<VisitEvent[]> => []);
	const store = new SessionParticipantsStore(
		{
			listSessionGuests: vi.fn(async () => [guest]),
			correctVisitStatus,
			listVisitEvents,
			...api,
		},
		notifications,
	);

	const success = vi.spyOn(notifications, 'success');
	const error = vi.spyOn(notifications, 'error');

	return { store, success, error, correctVisitStatus, listVisitEvents };
}

describe('SessionParticipantsStore', () => {
	it('loads a session’s guests into a section per status', async () => {
		// Arrange
		const { store } = setup();

		// Act
		await store.load('event-1');

		// Assert
		expect(store.sessionId).toBe('event-1');
		expect(store.participants?.groups).toEqual([{ status: 'no_show', guests: [guest] }]);
	});

	it('drops guests that arrive after the session was closed', async () => {
		// Arrange
		let answer: (guests: AdminGuest[]) => void = () => {};
		const { store } = setup({
			listSessionGuests: () => new Promise((resolve) => (answer = resolve)),
		});
		const loading = store.load('event-1');

		// Act
		store.close();
		answer([guest]);
		await loading;

		// Assert
		expect(store.sessionId).toBeNull();
		expect(store.participants).toBeNull();
	});

	it('says so when the guests cannot be read, and reads them again on a retry', async () => {
		// Arrange
		const listSessionGuests = vi
			.fn<SessionParticipantsApi['listSessionGuests']>()
			.mockRejectedValueOnce(new Error('offline'))
			.mockResolvedValueOnce([guest]);
		const { store, error } = setup({ listSessionGuests });

		await store.load('event-1');
		const failed = store.loadFailed;

		// Act
		await store.load('event-1');

		// Assert
		expect(failed).toBe(true);
		expect(error).toHaveBeenCalledWith(t.loadFailed);
		expect(store.loadFailed).toBe(false);
		expect(store.participants?.count).toBe(1);
	});

	it('opens a ticket with its history', async () => {
		// Arrange
		const { store, listVisitEvents } = setup();

		listVisitEvents.mockResolvedValueOnce([correction]);
		await store.load('event-1');

		// Act
		store.select(guest);
		await vi.waitFor(() => expect(store.history).not.toBeNull());

		// Assert
		expect(store.selected).toEqual(guest);
		expect(store.history).toEqual([correction]);
	});

	it('folds a section away and back', () => {
		// Arrange
		const { store } = setup();

		// Act
		store.toggleSection('served');
		const folded = store.isCollapsed('served');

		store.toggleSection('served');

		// Assert
		expect(folded).toBe(true);
		expect(store.isCollapsed('served')).toBe(false);
	});

	it('corrects a status from the one shown, keeps the ticket open, and rereads its history', async () => {
		// Arrange
		const { store, success, correctVisitStatus, listVisitEvents } = setup();

		await store.load('event-1');
		store.select(guest);
		listVisitEvents.mockResolvedValueOnce([correction]);

		// Act
		const saved = await store.correct(guest, 'served');

		// Assert
		expect(saved).toBe(true);
		expect(correctVisitStatus).toHaveBeenCalledWith('event-1', 'visit-1', {
			fromStatus: 'no_show',
			status: 'served',
		});
		expect(store.selected?.status).toBe('served');
		expect(store.history).toEqual([correction]);
		expect(success).toHaveBeenCalledWith(t.corrected);
		expect(store.correctingVisitId).toBeNull();
	});

	it('keeps the list as it was and passes on the server’s reason when refused', async () => {
		// Arrange
		const reason = 'This guest’s status changed since the list was loaded. Refresh and try again.';
		const { store, error } = setup({
			correctVisitStatus: vi.fn(async () => {
				throw new AdminRequestError('status_correction', reason);
			}),
		});

		await store.load('event-1');

		// Act
		const saved = await store.correct(guest, 'served');

		// Assert
		expect(saved).toBe(false);
		expect(store.participants?.groups.map((group) => group.status)).toEqual(['no_show']);
		expect(error).toHaveBeenCalledWith(reason);
	});
});
