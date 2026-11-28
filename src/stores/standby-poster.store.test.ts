import { describe, expect, it, vi } from 'vitest';

import { StandbyPosterStore } from './standby-poster.store.ts';

describe('StandbyPosterStore', () => {
	it('holds the current session’s code, ready to print', async () => {
		// Arrange
		const store = new StandbyPosterStore(vi.fn().mockResolvedValue('event-1.signature'));

		// Act
		await store.load();

		// Assert
		expect(store.state).toBe('ready');
		expect(store.code).toBe('event-1.signature');
	});

	it('says so when there is no session to print a code for', async () => {
		// Arrange
		const store = new StandbyPosterStore(vi.fn().mockResolvedValue(null));

		// Act
		await store.load();

		// Assert
		expect(store.state).toBe('no_session');
	});

	it('says so when the code couldn’t be read', async () => {
		// Arrange
		const store = new StandbyPosterStore(vi.fn().mockRejectedValue(new Error('403')));

		// Act
		await store.load();

		// Assert
		expect(store.state).toBe('failed');
	});
});
