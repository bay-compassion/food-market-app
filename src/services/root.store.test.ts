import { afterEach, describe, expect, it, vi } from 'vitest';

import { RootStore } from './root.store';

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('RootStore', () => {
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
		expect(store.guest).toBeDefined();
		store.setAccessTokenProvider(() => Promise.resolve('token'));

		store.start();
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
});
