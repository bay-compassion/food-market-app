import { afterEach, describe, expect, it } from 'vitest';

import { StorageKey, StorageService } from '../services/storage.service';
import { GuestTourStore } from './guest-tour.store';

afterEach(() => {
	window.localStorage.clear();
});

describe('GuestTourStore', () => {
	it('offers the tour to a device that has not seen it', () => {
		// Arrange
		const store = new GuestTourStore(new StorageService());

		// Act
		store.offer();

		// Assert
		expect(store.isRunning).toBe(true);
	});

	it('does not offer the tour again once it has been seen', () => {
		// Arrange
		const storage = new StorageService();

		storage.set(StorageKey.GUEST_TOUR_SEEN, true);
		const store = new GuestTourStore(storage);

		// Act
		store.offer();

		// Assert
		expect(store.isRunning).toBe(false);
	});

	it('replays a tour that has been seen when started explicitly', () => {
		// Arrange
		const storage = new StorageService();

		storage.set(StorageKey.GUEST_TOUR_SEEN, true);
		const store = new GuestTourStore(storage);

		// Act
		store.start();

		// Assert
		expect(store.isRunning).toBe(true);
	});

	it('remembers a finished or skipped tour across visits', () => {
		// Arrange
		const storage = new StorageService();
		const store = new GuestTourStore(storage);

		store.start();

		// Act
		store.finish();

		// Assert
		expect(store.isRunning).toBe(false);
		expect(store.hasBeenSeen).toBe(true);
		expect(new GuestTourStore(storage).hasBeenSeen).toBe(true);
	});
});
