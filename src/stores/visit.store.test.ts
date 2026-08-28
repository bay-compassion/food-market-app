import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VisitStore } from './visit.store';

const visitTokenKey = 'bay-compassion.visit-token';
const registered = { id: 'visit-1', status: 'registered' as const, visitToken: 'token-1' };

describe('VisitStore', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	describe('submit', () => {
		it('saves the visit token and records the visit as active', () => {
			// Arrange
			const store = new VisitStore();

			// Act
			store.submit(registered);

			// Assert
			expect(window.localStorage.getItem(visitTokenKey)).toBe('token-1');
			expect(store.activeVisit).toEqual({
				id: 'visit-1',
				status: 'registered',
				queuePosition: null,
				aheadOfYou: null,
			});
			expect(store.hasActiveVisit).toBe(true);
		});

		it('schedules a refresh while the visit is live', async () => {
			// Arrange
			vi.useFakeTimers();
			const lookupActiveVisit = vi.fn().mockResolvedValue({ found: true, visit: registered });
			const store = new VisitStore({ lookupActiveVisit });

			// Act
			store.submit(registered);
			await vi.advanceTimersByTimeAsync(15_000);

			// Assert
			expect(lookupActiveVisit).toHaveBeenCalledWith('token-1');
		});
	});

	describe('refresh', () => {
		it('does nothing without a stored token', async () => {
			// Arrange
			const lookupActiveVisit = vi.fn();
			const store = new VisitStore({ lookupActiveVisit });

			// Act
			await store.refresh();

			// Assert
			expect(lookupActiveVisit).not.toHaveBeenCalled();
			expect(store.activeVisit).toBeNull();
		});

		it('loads the active visit for a stored token', async () => {
			// Arrange
			window.localStorage.setItem(visitTokenKey, 'token-1');
			const lookupActiveVisit = vi.fn().mockResolvedValue({ found: true, visit: registered });
			const store = new VisitStore({ lookupActiveVisit });

			// Act
			await store.refresh();

			// Assert
			expect(store.activeVisit).toEqual(registered);
			expect(store.isSubmitted).toBe(true);
		});

		it('clears an expired token', async () => {
			// Arrange
			window.localStorage.setItem(visitTokenKey, 'expired-token');
			const lookupActiveVisit = vi.fn().mockResolvedValue({ found: false, reason: 'expired' });
			const store = new VisitStore({ lookupActiveVisit });

			// Act
			await store.refresh();

			// Assert
			expect(window.localStorage.getItem(visitTokenKey)).toBeNull();
			expect(store.activeVisit).toBeNull();
			expect(store.isSubmitted).toBe(false);
		});

		it('keeps a stored token when the lookup is unreachable', async () => {
			// Arrange
			window.localStorage.setItem(visitTokenKey, 'token-1');
			const lookupActiveVisit = vi.fn().mockResolvedValue({ found: false, reason: 'unreachable' });
			const store = new VisitStore({ lookupActiveVisit });

			// Act
			await store.refresh();

			// Assert
			expect(window.localStorage.getItem(visitTokenKey)).toBe('token-1');
			expect(store.activeVisit).toBeNull();
		});

		it('stops scheduling refreshes once the visit is no longer live', async () => {
			// Arrange
			vi.useFakeTimers();
			window.localStorage.setItem(visitTokenKey, 'token-1');
			const lookupActiveVisit = vi
				.fn()
				.mockResolvedValue({ found: true, visit: { ...registered, status: 'served' } });
			const store = new VisitStore({ lookupActiveVisit });

			// Act
			await store.refresh();
			await vi.advanceTimersByTimeAsync(30_000);

			// Assert
			expect(lookupActiveVisit).toHaveBeenCalledTimes(1);
		});

		it('reuses an in-flight lookup instead of firing a second request', async () => {
			// Arrange
			window.localStorage.setItem(visitTokenKey, 'token-1');
			let resolveLookup!: (value: { found: true; visit: typeof registered }) => void;
			const lookupActiveVisit = vi.fn().mockReturnValue(
				new Promise((resolve) => {
					resolveLookup = resolve;
				}),
			);
			const store = new VisitStore({ lookupActiveVisit });

			// Act
			const first = store.refresh();
			const second = store.refresh();

			resolveLookup({ found: true, visit: registered });
			await Promise.all([first, second]);

			// Assert
			expect(lookupActiveVisit).toHaveBeenCalledTimes(1);
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

		it('applies the server response to the active visit', async () => {
			// Arrange
			window.localStorage.setItem(visitTokenKey, 'token-1');
			const cancelVisit = vi.fn().mockResolvedValue({ id: 'visit-1', status: 'cancelled' });
			const store = new VisitStore({
				cancelVisit,
				lookupActiveVisit: vi.fn().mockResolvedValue({ found: true, visit: registered }),
			});

			await store.refresh();

			// Act
			await store.cancel();

			// Assert
			expect(store.activeVisit?.status).toBe('cancelled');
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
			const lookupActiveVisit = vi.fn().mockResolvedValue({ found: true, visit: registered });
			const store = new VisitStore({ lookupActiveVisit });

			store.submit(registered);

			// Act
			store[Symbol.dispose]();
			await vi.advanceTimersByTimeAsync(30_000);

			// Assert
			expect(lookupActiveVisit).not.toHaveBeenCalled();
		});
	});
});
