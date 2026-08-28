import { afterEach, describe, expect, it, vi } from 'vitest';
import { computed } from 'vue';

import { SessionStatusEnum } from '@/services/sessionStateMachine.ts';

import {
	MarketSessionStore,
	type SessionEvent,
	type SessionOverview,
} from './market-session.store';

const overview = (event: SessionEvent | null): SessionOverview => ({
	event,
	questions: [],
	counts: {},
});

const scheduledEvent: SessionEvent = {
	id: 'event-1',
	registrationOpensAt: '2026-08-25T18:00:00.000Z',
	registrationClosesAt: '2026-08-25T19:00:00.000Z',
	capacity: 50,
	sessionMode: 'scheduled',
	status: SessionStatusEnum.SCHEDULED,
};

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('MarketSessionStore', () => {
	it('loads and exposes the current overview', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(overview(scheduledEvent)));
		const store = new MarketSessionStore();

		await store.getStatus();

		expect(store.currentState?.event).toEqual(scheduledEvent);
		expect(store.error).toBeNull();
		expect(store.isLoading).toBe(false);
	});

	it('derives a reactive market event with Date timing values', () => {
		const store = new MarketSessionStore();
		const status = computed(() => store.marketEvent?.status);

		store.applyServerState(overview(scheduledEvent));

		expect(store.marketEvent?.registrationOpensAt).toEqual(
			new Date(scheduledEvent.registrationOpensAt),
		);
		expect(store.marketEvent?.registrationClosesAt).toEqual(
			new Date(scheduledEvent.registrationClosesAt),
		);
		expect(status.value).toBe('scheduled');

		store.applyServerState(
			overview({ ...scheduledEvent, status: SessionStatusEnum.REGISTRATION_OPEN }),
		);
		expect(status.value).toBe('registration_open');
	});

	it('sends typed commands and applies the overview returned by the server', async () => {
		const registrationOpen: SessionEvent = {
			...scheduledEvent,
			status: SessionStatusEnum.REGISTRATION_OPEN,
		};
		const fetchMock = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(Response.json(overview(registrationOpen)));
		const store = new MarketSessionStore({
			requestHeaders: () => ({ Authorization: 'Bearer token' }),
		});

		await expect(
			store.sendCommand('update_registration', {
				registrationClosesAt: '2026-08-25T19:30:00.000Z',
				capacity: 75,
			}),
		).resolves.toBe(true);

		const [, init] = fetchMock.mock.calls[0]!;

		expect(init?.method).toBe('POST');
		expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer token');
		expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json');
		expect(typeof init?.body).toBe('string');
		const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null;

		expect(body).toEqual({
			action: 'update_registration',
			registrationClosesAt: '2026-08-25T19:30:00.000Z',
			capacity: 75,
		});
		expect(store.currentState?.event?.status).toBe('registration_open');
	});

	it('returns false and exposes the backend error when a command fails', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			Response.json({ error: 'That transition is no longer available.' }, { status: 409 }),
		);
		const store = new MarketSessionStore();

		await expect(store.sendCommand('close_registration')).resolves.toBe(false);

		expect(store.error?.message).toBe('That transition is no longer available.');
		expect(store.isSending).toBe(false);
	});

	it('saves settings through the same state-owning endpoint', async () => {
		const fetchMock = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(Response.json(overview(scheduledEvent)));
		const store = new MarketSessionStore();

		await expect(
			store.saveSettings({
				registrationOpensAt: scheduledEvent.registrationOpensAt,
				registrationClosesAt: scheduledEvent.registrationClosesAt,
				capacity: scheduledEvent.capacity,
				sessionMode: scheduledEvent.sessionMode,
				questions: [],
			}),
		).resolves.toBe(true);

		expect(fetchMock).toHaveBeenCalledWith(
			'/api/market',
			expect.objectContaining({ method: 'PUT' }),
		);
		expect(store.currentState).toEqual(overview(scheduledEvent));
	});

	it('polls immediately, avoids duplicate timers, and stops cleanly', async () => {
		vi.useFakeTimers();
		const fetchMock = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(Response.json(overview(scheduledEvent)));
		const store = new MarketSessionStore({ pollIntervalMs: 1_000 });

		store.startPolling();
		store.startPolling();
		await vi.advanceTimersByTimeAsync(2_000);

		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(store.isPolling).toBe(true);

		store.stopPolling();
		await vi.advanceTimersByTimeAsync(2_000);

		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(store.isPolling).toBe(false);
	});

	it('pauses while the page is hidden and refreshes immediately when it becomes visible', async () => {
		vi.useFakeTimers();
		let visibility: DocumentVisibilityState = 'visible';

		vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
		const fetchMock = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(Response.json(overview(scheduledEvent)));
		const store = new MarketSessionStore({ pollIntervalMs: 1_000 });

		store.startPolling();
		await vi.advanceTimersByTimeAsync(1_000);
		expect(fetchMock).toHaveBeenCalledTimes(2);

		visibility = 'hidden';
		document.dispatchEvent(new Event('visibilitychange'));
		await vi.advanceTimersByTimeAsync(5_000);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(store.isPolling).toBe(false);

		visibility = 'visible';
		document.dispatchEvent(new Event('visibilitychange'));
		await vi.advanceTimersByTimeAsync(0);
		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(store.isPolling).toBe(true);

		window.dispatchEvent(new PageTransitionEvent('pagehide'));
		await vi.advanceTimersByTimeAsync(2_000);
		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(store.isPolling).toBe(false);

		window.dispatchEvent(new PageTransitionEvent('pageshow'));
		await vi.advanceTimersByTimeAsync(0);
		expect(fetchMock).toHaveBeenCalledTimes(4);
		expect(store.isPolling).toBe(true);

		store.stopPolling();
		window.dispatchEvent(new PageTransitionEvent('pageshow'));
		await vi.advanceTimersByTimeAsync(2_000);
		expect(fetchMock).toHaveBeenCalledTimes(4);
	});
});
