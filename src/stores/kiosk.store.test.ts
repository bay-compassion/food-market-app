import { afterEach, describe, expect, it, vi } from 'vitest';

import type { QueueBoardState } from '../models/queue-board';
import type { QueueBoardResult } from '../services/kiosk-api';
import { KioskStore } from './kiosk.store';

const state: QueueBoardState = {
	sessionStatus: 'service_started',
	nowCalling: 5,
	called: [2, 5],
	waitingCount: 8,
};

function storeReturning(...results: QueueBoardResult[]) {
	const queueBoard = vi.fn<() => Promise<QueueBoardResult>>();

	for (const result of results) {
		queueBoard.mockResolvedValueOnce(result);
	}

	return { store: new KioskStore({ api: { queueBoard } }), queueBoard };
}

afterEach(() => {
	vi.useRealTimers();
});

describe('KioskStore', () => {
	it('is loading until the first read', () => {
		// Arrange
		const { store } = storeReturning();

		// Assert
		expect(store.isLoading).toBe(true);
		expect(store.board).toBeNull();
	});

	it('exposes the board it read', async () => {
		// Arrange
		const { store } = storeReturning({ ok: true, state });

		// Act
		await store.refresh();

		// Assert
		expect(store.isLoading).toBe(false);
		expect(store.board?.nowCalling).toBe(5);
		expect(store.board?.stillWaitingFor).toEqual([2]);
		expect(store.failure).toBeNull();
	});

	it('keeps the last board on screen when a later read fails, and clears the failure on recovery', async () => {
		// Arrange
		const { store } = storeReturning(
			{ ok: true, state },
			{ ok: false, failure: 'connection' },
			{ ok: true, state: { ...state, nowCalling: 6, called: [2, 6] } },
		);

		// Act
		await store.refresh();
		await store.refresh();
		const duringOutage = { failure: store.failure, nowCalling: store.board?.nowCalling };

		await store.refresh();

		// Assert
		expect(duringOutage).toEqual({ failure: 'connection', nowCalling: 5 });
		expect(store.failure).toBeNull();
		expect(store.board?.nowCalling).toBe(6);
	});

	it('shares a read already in flight', async () => {
		// Arrange
		const { store, queueBoard } = storeReturning({ ok: true, state });

		// Act
		await Promise.all([store.refresh(), store.refresh()]);

		// Assert
		expect(queueBoard).toHaveBeenCalledTimes(1);
	});

	it('polls on an interval until disposed', async () => {
		// Arrange
		vi.useFakeTimers();
		const queueBoard = vi.fn(async (): Promise<QueueBoardResult> => ({ ok: true, state }));
		const store = new KioskStore({ api: { queueBoard }, pollIntervalMs: 1_000 });

		// Act
		store.start();
		await vi.advanceTimersByTimeAsync(2_500);
		store[Symbol.dispose]();
		await vi.advanceTimersByTimeAsync(5_000);

		// Assert
		expect(queueBoard).toHaveBeenCalledTimes(3);
	});
});
