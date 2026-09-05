import { observable } from 'mobx';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionStatusEnum } from '../services/sessionStateMachine';
import type { SessionOverview } from './market-session.store';
import { VisitStore, type VisitStoreOptions } from './visit.store';

const visitTokenKey = 'bay-compassion.visit-token';
const registered = { id: 'visit-1', status: 'registered' as const, visitToken: 'token-1' };
const currentRegisteredVisit = {
	id: 'visit-1',
	marketEventId: 'event-1',
	status: 'registered' as const,
	queuePosition: null,
	aheadOfYou: null,
};

function sessionOverview(eventId: string): SessionOverview {
	return {
		event: {
			id: eventId,
			registrationOpensAt: '2026-01-01T10:00:00.000Z',
			registrationClosesAt: '2026-01-01T11:00:00.000Z',
			capacity: 50,
			sessionMode: 'scheduled',
			status: SessionStatusEnum.SERVICE_STARTED,
		},
		questions: [],
		counts: {},
	};
}

function createVisitStoreHarness(options: VisitStoreOptions = {}) {
	const currentState = observable.box<SessionOverview | null>(null);
	const rootStore = {
		session: {
			get currentState() {
				return currentState.get();
			},
		},
	};

	return {
		store: new VisitStore(rootStore, options),
		setMarketEvent: (eventId: string) => currentState.set(sessionOverview(eventId)),
	};
}

function createVisitStore(options: VisitStoreOptions = {}) {
	return createVisitStoreHarness(options).store;
}

describe('VisitStore', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	describe('submit', () => {
		it('saves the visit token and records the current market visit', () => {
			// Arrange
			const store = createVisitStore();

			// Act
			store.submit(registered, 'event-1');

			// Assert
			expect(window.localStorage.getItem(visitTokenKey)).toBe('token-1');
			expect(store.currentVisit).toEqual({
				id: 'visit-1',
				marketEventId: 'event-1',
				status: 'registered',
				queuePosition: null,
				aheadOfYou: null,
			});
		});

		it('schedules a refresh while the visit is live', async () => {
			// Arrange
			vi.useFakeTimers();
			const lookupCurrentVisit = vi
				.fn()
				.mockResolvedValue({ found: true, visit: currentRegisteredVisit });
			const store = createVisitStore({ lookupCurrentVisit });

			// Act
			store.submit(registered, 'event-1');
			await vi.advanceTimersByTimeAsync(15_000);

			// Assert
			expect(lookupCurrentVisit).toHaveBeenCalledWith('token-1');
		});
	});

	describe('refresh', () => {
		it('does nothing without a stored token', async () => {
			// Arrange
			const lookupCurrentVisit = vi.fn();
			const store = createVisitStore({ lookupCurrentVisit });

			// Act
			await store.refresh();

			// Assert
			expect(lookupCurrentVisit).not.toHaveBeenCalled();
			expect(store.currentVisit).toBeNull();
		});

		it('loads the current visit for a stored token', async () => {
			// Arrange
			window.localStorage.setItem(visitTokenKey, 'token-1');
			const lookupCurrentVisit = vi
				.fn()
				.mockResolvedValue({ found: true, visit: currentRegisteredVisit });
			const store = createVisitStore({ lookupCurrentVisit });

			// Act
			await store.refresh();

			// Assert
			expect(store.currentVisit).toEqual(currentRegisteredVisit);
		});

		it('discards a visit from another market when the session loads first', async () => {
			// Arrange
			window.localStorage.setItem(visitTokenKey, 'token-1');
			const lookupCurrentVisit = vi
				.fn()
				.mockResolvedValue({ found: true, visit: currentRegisteredVisit });
			const { store, setMarketEvent } = createVisitStoreHarness({ lookupCurrentVisit });

			setMarketEvent('event-2');

			// Act
			await store.refresh();

			// Assert
			expect(store.currentVisit).toBeNull();
			expect(window.localStorage.getItem(visitTokenKey)).toBeNull();
		});

		it('discards a visit from another market when the visit loads first', async () => {
			// Arrange
			window.localStorage.setItem(visitTokenKey, 'token-1');
			const lookupCurrentVisit = vi
				.fn()
				.mockResolvedValue({ found: true, visit: currentRegisteredVisit });
			const { store, setMarketEvent } = createVisitStoreHarness({ lookupCurrentVisit });

			await store.refresh();

			// Act
			setMarketEvent('event-2');

			// Assert
			expect(store.currentVisit).toBeNull();
			expect(window.localStorage.getItem(visitTokenKey)).toBeNull();
		});

		it('keeps a visit belonging to the loaded market', async () => {
			// Arrange
			window.localStorage.setItem(visitTokenKey, 'token-1');
			const lookupCurrentVisit = vi
				.fn()
				.mockResolvedValue({ found: true, visit: currentRegisteredVisit });
			const { store, setMarketEvent } = createVisitStoreHarness({ lookupCurrentVisit });

			setMarketEvent('event-1');

			// Act
			await store.refresh();

			// Assert
			expect(store.currentVisit).toEqual(currentRegisteredVisit);
			expect(window.localStorage.getItem(visitTokenKey)).toBe('token-1');
		});

		it('clears an expired token', async () => {
			// Arrange
			window.localStorage.setItem(visitTokenKey, 'expired-token');
			const lookupCurrentVisit = vi.fn().mockResolvedValue({ found: false, reason: 'expired' });
			const store = createVisitStore({ lookupCurrentVisit });

			// Act
			await store.refresh();

			// Assert
			expect(window.localStorage.getItem(visitTokenKey)).toBeNull();
			expect(store.currentVisit).toBeNull();
		});

		it('keeps a stored token when the lookup is unreachable', async () => {
			// Arrange
			window.localStorage.setItem(visitTokenKey, 'token-1');
			const lookupCurrentVisit = vi.fn().mockResolvedValue({ found: false, reason: 'unreachable' });
			const store = createVisitStore({ lookupCurrentVisit });

			// Act
			await store.refresh();

			// Assert
			expect(window.localStorage.getItem(visitTokenKey)).toBe('token-1');
			expect(store.currentVisit).toBeNull();
		});

		it('stops scheduling refreshes once the visit is no longer live', async () => {
			// Arrange
			vi.useFakeTimers();
			window.localStorage.setItem(visitTokenKey, 'token-1');
			const lookupCurrentVisit = vi.fn().mockResolvedValue({
				found: true,
				visit: { ...currentRegisteredVisit, status: 'served' },
			});
			const store = createVisitStore({ lookupCurrentVisit });

			// Act
			await store.refresh();
			await vi.advanceTimersByTimeAsync(30_000);

			// Assert
			expect(lookupCurrentVisit).toHaveBeenCalledTimes(1);
		});

		it('keeps polling a no-show visit because it can return to the queue', async () => {
			// Arrange
			vi.useFakeTimers();
			window.localStorage.setItem(visitTokenKey, 'token-1');
			const lookupCurrentVisit = vi.fn().mockResolvedValue({
				found: true,
				visit: { ...currentRegisteredVisit, status: 'no_show' },
			});
			const store = createVisitStore({ lookupCurrentVisit });

			// Act
			await store.refresh();
			await vi.advanceTimersByTimeAsync(15_000);

			// Assert
			expect(lookupCurrentVisit).toHaveBeenCalledTimes(2);
		});

		it('reuses an in-flight lookup instead of firing a second request', async () => {
			// Arrange
			window.localStorage.setItem(visitTokenKey, 'token-1');
			let resolveLookup!: (value: { found: true; visit: typeof currentRegisteredVisit }) => void;
			const lookupCurrentVisit = vi.fn().mockReturnValue(
				new Promise((resolve) => {
					resolveLookup = resolve;
				}),
			);
			const store = createVisitStore({ lookupCurrentVisit });

			// Act
			const first = store.refresh();
			const second = store.refresh();

			resolveLookup({ found: true, visit: currentRegisteredVisit });
			await Promise.all([first, second]);

			// Assert
			expect(lookupCurrentVisit).toHaveBeenCalledTimes(1);
		});
	});

	describe('cancel', () => {
		it('does nothing without a stored token', async () => {
			// Arrange
			const cancelVisit = vi.fn();
			const store = createVisitStore({ cancelVisit });

			// Act
			await store.cancel();

			// Assert
			expect(cancelVisit).not.toHaveBeenCalled();
		});

		it('applies the server response to the current visit', async () => {
			// Arrange
			window.localStorage.setItem(visitTokenKey, 'token-1');
			const cancelVisit = vi.fn().mockResolvedValue({ id: 'visit-1', status: 'cancelled' });
			const store = createVisitStore({
				cancelVisit,
				lookupCurrentVisit: vi
					.fn()
					.mockResolvedValue({ found: true, visit: currentRegisteredVisit }),
			});

			await store.refresh();

			// Act
			await store.cancel();

			// Assert
			expect(store.currentVisit?.status).toBe('cancelled');
			expect(store.cancelError).toBe(false);
		});

		it('records an error when the request fails', async () => {
			// Arrange
			window.localStorage.setItem(visitTokenKey, 'token-1');
			const cancelVisit = vi.fn().mockRejectedValue(new Error('cancel'));
			const store = createVisitStore({ cancelVisit });

			// Act
			await store.cancel();

			// Assert
			expect(store.cancelError).toBe(true);
			expect(store.isCancelling).toBe(false);
		});
	});

	describe('nextRefreshAt', () => {
		it('is null until a refresh is scheduled', () => {
			// Arrange
			const store = createVisitStore();

			// Act
			const nextRefreshAt = store.nextRefreshAt;

			// Assert
			expect(nextRefreshAt).toBeNull();
		});

		it('reports when the scheduled refresh is due', () => {
			// Arrange
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-01-01T10:00:00.000Z'));
			const store = createVisitStore({ refreshIntervalMs: 20_000 });

			// Act
			store.submit(registered, 'event-1');

			// Assert
			expect(store.nextRefreshAt).toBe(Date.now() + 20_000);
		});

		it('moves to the next cycle once a refresh completes', async () => {
			// Arrange
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-01-01T10:00:00.000Z'));
			const lookupCurrentVisit = vi
				.fn()
				.mockResolvedValue({ found: true, visit: currentRegisteredVisit });
			const store = createVisitStore({ lookupCurrentVisit, refreshIntervalMs: 20_000 });

			store.submit(registered, 'event-1');

			// Act
			await vi.advanceTimersByTimeAsync(20_000);

			// Assert
			expect(store.nextRefreshAt).toBe(Date.now() + 20_000);
		});

		it('clears once the visit stops refreshing', async () => {
			// Arrange
			vi.useFakeTimers();
			const lookupCurrentVisit = vi
				.fn()
				.mockResolvedValue({ found: true, visit: { ...currentRegisteredVisit, status: 'served' } });
			const store = createVisitStore({ lookupCurrentVisit, refreshIntervalMs: 20_000 });

			store.submit(registered, 'event-1');

			// Act
			await vi.advanceTimersByTimeAsync(20_000);

			// Assert
			expect(store.nextRefreshAt).toBeNull();
		});
	});

	describe('[Symbol.dispose]', () => {
		it('stops a pending refresh', async () => {
			// Arrange
			vi.useFakeTimers();
			const lookupCurrentVisit = vi
				.fn()
				.mockResolvedValue({ found: true, visit: currentRegisteredVisit });
			const store = createVisitStore({ lookupCurrentVisit });

			store.submit(registered, 'event-1');

			// Act
			store[Symbol.dispose]();
			await vi.advanceTimersByTimeAsync(30_000);

			// Assert
			expect(lookupCurrentVisit).not.toHaveBeenCalled();
			expect(store.nextRefreshAt).toBeNull();
		});
	});
});
