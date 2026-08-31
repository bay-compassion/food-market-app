import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VisitStore } from './visit.store';

const visitTokenKey = 'bay-compassion.visit-token';
const registered = { id: 'visit-1', status: 'registered' as const, visitToken: 'token-1' };
const currentRegisteredVisit = {
	id: 'visit-1',
	marketEventId: 'event-1',
	status: 'registered' as const,
	queuePosition: null,
	aheadOfYou: null,
};

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
			const store = new VisitStore();

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
			const store = new VisitStore({ lookupCurrentVisit });

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
			const store = new VisitStore({ lookupCurrentVisit });

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
			const store = new VisitStore({ lookupCurrentVisit });

			// Act
			await store.refresh();

			// Assert
			expect(store.currentVisit).toEqual(currentRegisteredVisit);
		});

		it('clears an expired token', async () => {
			// Arrange
			window.localStorage.setItem(visitTokenKey, 'expired-token');
			const lookupCurrentVisit = vi.fn().mockResolvedValue({ found: false, reason: 'expired' });
			const store = new VisitStore({ lookupCurrentVisit });

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
			const store = new VisitStore({ lookupCurrentVisit });

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
			const store = new VisitStore({ lookupCurrentVisit });

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
			const store = new VisitStore({ lookupCurrentVisit });

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
			const store = new VisitStore({ lookupCurrentVisit });

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
			const store = new VisitStore({ cancelVisit });

			// Act
			await store.cancel();

			// Assert
			expect(cancelVisit).not.toHaveBeenCalled();
		});

		it('applies the server response to the current visit', async () => {
			// Arrange
			window.localStorage.setItem(visitTokenKey, 'token-1');
			const cancelVisit = vi.fn().mockResolvedValue({ id: 'visit-1', status: 'cancelled' });
			const store = new VisitStore({
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
			const store = new VisitStore({ cancelVisit });

			// Act
			await store.cancel();

			// Assert
			expect(store.cancelError).toBe(true);
			expect(store.isCancelling).toBe(false);
		});
	});

	describe('[Symbol.dispose]', () => {
		it('stops a pending refresh', async () => {
			// Arrange
			vi.useFakeTimers();
			const lookupCurrentVisit = vi
				.fn()
				.mockResolvedValue({ found: true, visit: currentRegisteredVisit });
			const store = new VisitStore({ lookupCurrentVisit });

			store.submit(registered, 'event-1');

			// Act
			store[Symbol.dispose]();
			await vi.advanceTimersByTimeAsync(30_000);

			// Assert
			expect(lookupCurrentVisit).not.toHaveBeenCalled();
		});
	});
});
