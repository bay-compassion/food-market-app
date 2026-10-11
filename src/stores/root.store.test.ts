import { afterEach, describe, expect, it, vi } from 'vitest';

import { StorageKey, StorageService } from '../services/storage.service';
import { RootStore } from './root.store';

afterEach(() => {
	window.localStorage.clear();
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('RootStore', () => {
	it('shares an injected storage service with guest and registration stores', () => {
		// Arrange
		const values = new Map<string, string>();
		const memoryStorage: Storage = {
			get length() {
				return values.size;
			},
			clear: () => values.clear(),
			getItem: (key) => values.get(key) ?? null,
			key: (index) => Array.from(values.keys())[index] ?? null,
			removeItem: (key) => values.delete(key),
			setItem: (key, value) => values.set(key, value),
		};
		const storage = new StorageService(memoryStorage);

		storage.set(StorageKey.GUEST_DEVICE_TOKEN, 'device-token');
		storage.set(StorageKey.GUEST_IDENTITY, {
			firstName: 'Ari',
			lastName: 'Guest',
			phone: '555-123-4567',
		});

		// Act
		const store = new RootStore({ storage });

		// Assert
		expect(store.storage).toBe(storage);
		expect(store.guest.displayedName).toBe('Ari G');
		expect(store.registration.guest).toMatchObject({
			firstName: 'Ari',
			lastName: 'Guest',
			phone: '555-123-4567',
		});
	});

	it('shares authentication and application lifetime with the session store', async () => {
		vi.useFakeTimers();
		const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			Response.json({
				event: null,
				questions: [],
				counts: {},
			}),
		);
		const store = new RootStore();
		const initializeGuest = vi.spyOn(store.guest, 'initialize').mockResolvedValue();

		expect(store.guest).toBeDefined();
		store.setAccessTokenProvider(() => Promise.resolve('token'));

		store.start();
		expect(initializeGuest).toHaveBeenCalledOnce();
		await vi.advanceTimersByTimeAsync(0);
		await vi.advanceTimersByTimeAsync(5_000);
		expect(fetchMock.mock.calls.filter(([, options]) => !options?.method)).toHaveLength(2);
		await store.session.sendCommand('reset_session');

		const command = fetchMock.mock.calls.find(([, options]) => options?.method === 'POST');

		expect(new Headers(command?.[1]?.headers).get('Authorization')).toBe('Bearer token');
		expect(store.session.isPolling).toBe(true);

		store[Symbol.dispose]();
		expect(store.session.isPolling).toBe(false);
	});

	it('starts and disposes the visit store alongside the session store', () => {
		// Arrange
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			Response.json({ event: null, questions: [], counts: {} }),
		);
		const store = new RootStore();
		const refreshVisit = vi.spyOn(store.visit, 'refresh').mockResolvedValue();
		const disposeVisit = vi.spyOn(store.visit, Symbol.dispose);

		// Act
		store.start();

		// Assert
		expect(refreshVisit).toHaveBeenCalledOnce();

		// Act
		store[Symbol.dispose]();

		// Assert
		expect(disposeVisit).toHaveBeenCalledOnce();
	});

	it('retires the first-visit introduction when a guest chooses a language', () => {
		// Arrange
		const store = new RootStore({ storage: new StorageService(window.localStorage) });

		// Act
		store.chooseLanguage('fa');

		// Assert
		expect(store.translations.locale).toBe('fa');
		expect(store.guest.isReturningVisitor).toBe(true);
	});

	it('resumes an unfinished tour for a returning visitor', () => {
		// Arrange
		const storage = new StorageService(window.localStorage);

		storage.set(StorageKey.RETURNING_VISITOR, true);
		const store = new RootStore({ storage });

		// Act
		store.resumeTour();

		// Assert
		expect(store.tour.isRunning).toBe(true);
	});

	it('leaves the tour for a first-time visitor until they choose a language', () => {
		// Arrange
		const store = new RootStore({ storage: new StorageService(window.localStorage) });

		// Act
		store.resumeTour();

		// Assert
		expect(store.tour.isRunning).toBe(false);
	});

	it('does not run the tour by starting the app, which leaves that to the flag-aware screen', () => {
		// Arrange
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			Response.json({ event: null, questions: [], counts: {} }),
		);
		const storage = new StorageService(window.localStorage);

		storage.set(StorageKey.RETURNING_VISITOR, true);
		const store = new RootStore({ storage });

		vi.spyOn(store.visit, 'refresh').mockResolvedValue();

		// Act
		store.start();

		// Assert
		expect(store.tour.isRunning).toBe(false);

		store[Symbol.dispose]();
	});
});
