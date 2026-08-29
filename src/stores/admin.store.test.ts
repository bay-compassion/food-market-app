import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminApi, AdminGuest } from '../services/admin-api';
import type { Permission } from '../services/permissions';
import { AdminStore } from './admin.store';
import type { MarketSessionStore, SessionOverview } from './market-session.store';

function overviewWith(eventId: string | null = 'event-1'): SessionOverview {
	return {
		event: eventId
			? {
					id: eventId,
					registrationOpensAt: '2026-03-01T17:00:00.000Z',
					registrationClosesAt: '2026-03-01T18:00:00.000Z',
					capacity: 40,
					sessionMode: 'scheduled',
					status: 'registration_open',
				}
			: null,
		questions: [],
		counts: {},
	} as SessionOverview;
}

function guestWith(overrides: Partial<AdminGuest> = {}): AdminGuest {
	return {
		id: 'visit-1',
		firstName: 'Ada',
		lastName: 'Lovelace',
		phone: '5105550123',
		householdSize: 2,
		locale: 'en',
		queuePosition: 1,
		calledAt: null,
		status: 'waiting',
		marketEventId: 'event-1',
		...overrides,
	};
}

/**
 * Both stubs stay plain objects of mocks and are cast only where the store takes them: reading a
 * method back off the cast type is what `unbound-method` flags, and these are only ever called.
 */
function storeWith(
	api: Record<string, unknown> = {},
	session: Record<string, unknown> = {},
	readPermissions: () => Promise<Permission[]> = async () => ['run:queue'],
) {
	const sessionStub = {
		currentState: overviewWith(),
		getStatus: vi.fn().mockResolvedValue(undefined),
		sendCommand: vi.fn().mockResolvedValue(true),
		saveSettings: vi.fn().mockResolvedValue(true),
		applyServerState: vi.fn(),
		...session,
	};
	const apiStub = {
		listAllGuests: vi.fn().mockResolvedValue([]),
		listSessionGuests: vi.fn().mockResolvedValue([]),
		listHistory: vi.fn().mockResolvedValue([]),
		runGuestCommand: vi.fn().mockResolvedValue(undefined),
		addGuest: vi.fn().mockResolvedValue(undefined),
		callNext: vi.fn().mockResolvedValue(['visit-1']),
		sendBroadcast: vi.fn().mockResolvedValue(3),
		loadDemoScenario: vi.fn().mockResolvedValue(overviewWith()),
		isDemoDataEnabled: vi.fn().mockResolvedValue(true),
		...api,
	};

	return {
		store: new AdminStore(sessionStub as unknown as MarketSessionStore, {
			api: apiStub as unknown as AdminApi,
			readPermissions,
		}),
		api: apiStub,
		session: sessionStub,
	};
}

beforeEach(() => {
	vi.restoreAllMocks();
});

describe('AdminStore', () => {
	it('offers only the screens the worker holds a permission for', async () => {
		// Arrange
		const { store } = storeWith({}, {}, async () => ['read:reports']);

		// Act
		await store.load();

		// Assert
		expect(store.views).toEqual(['reports']);
		expect(store.can('read:reports')).toBe(true);
		expect(store.can('run:queue')).toBe(false);
	});

	it('does not request guest data a worker would be refused', async () => {
		// Arrange
		const { store, api } = storeWith({}, {}, async () => ['read:reports']);

		// Act
		await store.load();

		// Assert
		expect(api.listAllGuests).not.toHaveBeenCalled();
		expect(api.listSessionGuests).not.toHaveBeenCalled();
	});

	it('loads guests, session guests, and history for a queue worker', async () => {
		// Arrange
		const { store, api } = storeWith();

		// Act
		await store.load();

		// Assert
		expect(api.listAllGuests).toHaveBeenCalledOnce();
		expect(api.listSessionGuests).toHaveBeenCalledWith('event-1');
		expect(api.listHistory).toHaveBeenCalledOnce();
	});

	it('holds no permissions when they cannot be read', async () => {
		// Arrange
		const { store } = storeWith({}, {}, () => Promise.reject(new Error('no token')));

		// Act
		await store.load();

		// Assert
		expect(store.permissions).toEqual([]);
		expect(store.views).toEqual([]);
	});

	it('skips the session guest request when no session is live', async () => {
		// Arrange
		const { store, api } = storeWith({}, { currentState: overviewWith(null) });

		// Act
		await store.refreshSessionGuests();

		// Assert
		expect(api.listSessionGuests).not.toHaveBeenCalled();
		expect(store.sessionGuests).toEqual([]);
	});

	it('reports a completed draw differently from any other session command', async () => {
		// Arrange
		const { store } = storeWith();

		// Act
		await store.runMarketAction('run_lottery');

		// Assert
		expect(store.feedback).toEqual({ kind: 'draw-complete' });
	});

	it('records a failure when a session command is rejected', async () => {
		// Arrange
		const { store } = storeWith({}, { sendCommand: vi.fn().mockResolvedValue(false) });

		// Act
		await store.runMarketAction('close_session');

		// Assert
		expect(store.feedback).toEqual({ kind: 'error' });
		expect(store.isBusy).toBe(false);
	});

	it('shows a guest their new status before the server confirms it', async () => {
		// Arrange
		let resolveCommand = () => {};
		const { store } = storeWith({
			runGuestCommand: vi.fn(
				() =>
					new Promise<void>((resolve) => {
						resolveCommand = resolve;
					}),
			),
		});
		const guest = guestWith();

		// Act
		const pending = store.runGuestCommand(guest, 'call');

		// Assert
		expect(guest.status).toBe('called');

		// Act
		resolveCommand();
		await pending;

		// Assert
		expect(guest.status).toBe('called');
	});

	it('puts a guest back on their previous status when the command fails', async () => {
		// Arrange
		const { store } = storeWith({
			runGuestCommand: vi.fn().mockRejectedValue(new Error('command')),
		});
		const guest = guestWith({ status: 'waiting' });

		// Act
		await store.runGuestCommand(guest, 'call');

		// Assert
		expect(guest.status).toBe('waiting');
		expect(store.feedback).toEqual({ kind: 'error' });
	});

	it('attaches a manually added guest to the live session by default', async () => {
		// Arrange
		const { store, api } = storeWith();

		// Act
		await store.addGuest({ firstName: 'Ada' } as never, { locale: 'en' });

		// Assert
		expect(api.addGuest).toHaveBeenCalledWith(expect.anything(), {
			marketEventId: 'event-1',
			locale: 'en',
		});
	});

	it('attaches a guest to the session the caller names, including none', async () => {
		// Arrange
		const { store, api } = storeWith();

		// Act
		await store.addGuest({ firstName: 'Ada' } as never, {
			marketEventId: 'past-event',
			locale: 'en',
		});

		// Assert
		expect(api.addGuest).toHaveBeenCalledWith(expect.anything(), {
			marketEventId: 'past-event',
			locale: 'en',
		});
	});

	it('says so when there was nobody left to call', async () => {
		// Arrange
		const { store } = storeWith({ callNext: vi.fn().mockResolvedValue([]) });

		// Act
		await store.callNext(5);

		// Assert
		expect(store.feedback).toEqual({ kind: 'no-waiting-guests' });
	});

	it('stays quiet when guests were actually called', async () => {
		// Arrange
		const { store } = storeWith();

		// Act
		await store.callNext(5);

		// Assert
		expect(store.feedback).toBeNull();
	});

	it('counts the recipients a broadcast reached', async () => {
		// Arrange
		const { store } = storeWith();

		// Act
		const sent = await store.sendBroadcast({ title: 'Doors open', body: 'Come in' });

		// Assert
		expect(sent).toBe(true);
		expect(store.feedback).toEqual({ kind: 'broadcast-queued', recipients: 3 });
	});

	it('reports a broadcast that reached nobody as unsent', async () => {
		// Arrange
		const { store } = storeWith({ sendBroadcast: vi.fn().mockResolvedValue(0) });

		// Act
		const sent = await store.sendBroadcast({ title: 'Doors open', body: 'Come in' });

		// Assert
		expect(sent).toBe(false);
		expect(store.feedback).toEqual({ kind: 'broadcast-no-recipients' });
	});

	it('hands a loaded demo scenario straight to the session store', async () => {
		// Arrange
		const { store, session } = storeWith();

		// Act
		await store.loadDemoScenario('service_started');

		// Assert
		expect(session.applyServerState).toHaveBeenCalledOnce();
		expect(store.feedback).toEqual({ kind: 'demo-loaded' });
	});

	it('clears the busy flag even when an action throws', async () => {
		// Arrange
		const { store } = storeWith({ callNext: vi.fn().mockRejectedValue(new Error('boom')) });

		// Act
		await store.callNext(1);

		// Assert
		expect(store.isBusy).toBe(false);
		expect(store.feedback).toEqual({ kind: 'error' });
	});
});
