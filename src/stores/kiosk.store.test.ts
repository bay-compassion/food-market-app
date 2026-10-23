import { afterEach, describe, expect, it, vi } from 'vitest';

import type { QueueBoardState } from '../models/queue-board';
import type { KioskUnlockOutcome, QueueBoardResult } from '../services/kiosk-api';
import { KioskStore, kioskTokenStorageKey } from './kiosk.store';

const state: QueueBoardState = {
	sessionStatus: 'service_started',
	nowCalling: 5,
	called: [2, 5],
	calledPriority: [],
	waitingCount: 8,
};

function memoryStorage(token: string | null = 'kiosk-token') {
	const items = new Map<string, string>(token ? [[kioskTokenStorageKey, token]] : []);

	return {
		items,
		getItem: (key: string) => items.get(key) ?? null,
		setItem: (key: string, value: string) => void items.set(key, value),
		removeItem: (key: string) => void items.delete(key),
	};
}

function storeWith({
	results = [],
	unlock = { ok: true, token: 'new-token' },
	token = 'kiosk-token',
}: {
	results?: QueueBoardResult[];
	unlock?: KioskUnlockOutcome;
	token?: string | null;
} = {}) {
	const queueBoard = vi.fn<(token: string) => Promise<QueueBoardResult>>();

	for (const result of results) {
		queueBoard.mockResolvedValueOnce(result);
	}

	const api = { queueBoard, unlock: vi.fn(async () => unlock) };
	const storage = memoryStorage(token);

	return { store: new KioskStore({ api, storage }), api, storage };
}

afterEach(() => {
	vi.useRealTimers();
});

describe('KioskStore', () => {
	it('is loading until the first read', () => {
		// Arrange
		const { store } = storeWith();

		// Assert
		expect(store.isLoading).toBe(true);
		expect(store.board).toBeNull();
	});

	it('reads the board with the token it kept', async () => {
		// Arrange
		const { store, api } = storeWith({ results: [{ ok: true, state }] });

		// Act
		await store.refresh();

		// Assert
		expect(api.queueBoard).toHaveBeenCalledWith('kiosk-token');
		expect(store.isLoading).toBe(false);
		expect(store.board?.nowCalling?.label).toBe('5');
		expect(store.board?.stillWaitingFor.map((number) => number.label)).toEqual(['2']);
		expect(store.isReconnecting).toBe(false);
	});

	it('keeps the last board on screen when a later read fails, and recovers', async () => {
		// Arrange
		const { store } = storeWith({
			results: [
				{ ok: true, state },
				{ ok: false, failure: 'connection' },
				{ ok: true, state: { ...state, nowCalling: 6, called: [2, 6] } },
			],
		});

		// Act
		await store.refresh();
		await store.refresh();
		const duringOutage = {
			reconnecting: store.isReconnecting,
			nowCalling: store.board?.nowCalling?.label,
		};

		await store.refresh();

		// Assert
		expect(duringOutage).toEqual({ reconnecting: true, nowCalling: '5' });
		expect(store.isReconnecting).toBe(false);
		expect(store.board?.nowCalling?.label).toBe('6');
	});

	it('shares a read already in flight', async () => {
		// Arrange
		const { store, api } = storeWith({ results: [{ ok: true, state }] });

		// Act
		await Promise.all([store.refresh(), store.refresh()]);

		// Assert
		expect(api.queueBoard).toHaveBeenCalledTimes(1);
	});

	it('starts locked, and polls nothing, without a token', () => {
		// Arrange
		vi.useFakeTimers();
		const { store, api } = storeWith({ token: null });

		// Act
		store.start();
		vi.advanceTimersByTime(60_000);

		// Assert
		expect(store.isLocked).toBe(true);
		expect(store.isLoading).toBe(false);
		expect(api.queueBoard).not.toHaveBeenCalled();
		store[Symbol.dispose]();
	});

	it('locks, forgets its token, and stops polling when the server refuses it', async () => {
		// Arrange
		vi.useFakeTimers();
		const { store, api, storage } = storeWith({
			results: [
				{ ok: true, state },
				{ ok: false, failure: 'locked' },
			],
		});

		// Act
		store.start();
		await vi.advanceTimersByTimeAsync(5_000);
		await vi.advanceTimersByTimeAsync(60_000);

		// Assert
		expect(store.isLocked).toBe(true);
		expect(store.board).toBeNull();
		expect(storage.items.has(kioskTokenStorageKey)).toBe(false);
		expect(api.queueBoard).toHaveBeenCalledTimes(2);
		store[Symbol.dispose]();
	});

	it('keeps the token a correct code buys, and starts reading the board', async () => {
		// Arrange
		const { store, api, storage } = storeWith({ token: null, results: [{ ok: true, state }] });

		// Act
		await store.unlock('123456');
		await vi.waitFor(() => expect(store.board).not.toBeNull());

		// Assert
		expect(api.unlock).toHaveBeenCalledWith('123456');
		expect(store.isLocked).toBe(false);
		expect(storage.items.get(kioskTokenStorageKey)).toBe('new-token');
		expect(api.queueBoard).toHaveBeenCalledWith('new-token');
		store[Symbol.dispose]();
	});

	it('stays locked and says why when the code is wrong', async () => {
		// Arrange
		const { store } = storeWith({
			token: null,
			unlock: { ok: false, failure: 'wrong_code' },
		});

		// Act
		await store.unlock('000000');

		// Assert
		expect(store.isLocked).toBe(true);
		expect(store.isUnlocking).toBe(false);
		expect(store.unlockFailure).toBe('wrong_code');
	});

	it('polls on an interval until disposed', async () => {
		// Arrange
		vi.useFakeTimers();
		const queueBoard = vi.fn(async (): Promise<QueueBoardResult> => ({ ok: true, state }));
		const store = new KioskStore({
			api: { queueBoard, unlock: vi.fn() },
			storage: memoryStorage(),
			pollIntervalMs: 1_000,
		});

		// Act
		store.start();
		await vi.advanceTimersByTimeAsync(2_500);
		store[Symbol.dispose]();
		await vi.advanceTimersByTimeAsync(5_000);

		// Assert
		expect(queueBoard).toHaveBeenCalledTimes(3);
	});

	it('checks in rarely while no session is under way, and quickly again once one is', async () => {
		// Arrange
		vi.useFakeTimers();
		const queueBoard = vi
			.fn<() => Promise<QueueBoardResult>>()
			.mockResolvedValueOnce({ ok: true, state: { ...state, sessionStatus: 'ended' } })
			.mockResolvedValue({ ok: true, state });
		const store = new KioskStore({
			api: { queueBoard, unlock: vi.fn() },
			storage: memoryStorage(),
			pollIntervalMs: 1_000,
			idlePollIntervalMs: 60_000,
		});

		// Act
		store.start();
		await vi.advanceTimersByTimeAsync(30_000);
		const whileIdle = queueBoard.mock.calls.length;

		await vi.advanceTimersByTimeAsync(30_000 + 3_000);

		// Assert
		expect(whileIdle).toBe(1);
		expect(queueBoard).toHaveBeenCalledTimes(1 + 1 + 3);
		store[Symbol.dispose]();
	});
});
