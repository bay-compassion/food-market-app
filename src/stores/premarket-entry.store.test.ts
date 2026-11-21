import { describe, expect, it, vi } from 'vitest';

import type { PremarketStatus } from '../services/premarket';
import { PremarketEntryStore } from './premarket-entry.store';

const registration = {
	id: 'visit-1',
	status: 'served' as const,
	visitToken: 'visit-token',
	marketEventId: 'event-1',
};

function entry(status: PremarketStatus = 'open') {
	const options = {
		registration: { submit: vi.fn().mockResolvedValue({ kind: 'registered', registration }) },
		visit: { submit: vi.fn() },
		guest: { markAsReturningVisitor: vi.fn() },
		checkStatus: vi.fn().mockResolvedValue(status),
	};

	return { store: new PremarketEntryStore(options), ...options };
}

describe('PremarketEntryStore', () => {
	it('takes on what the server says about the premarket', async () => {
		// Arrange
		const { store } = entry('closed');

		// Act
		await store.check();

		// Assert
		expect(store.state).toBe('closed');
	});

	it('checks in for the premarket and keeps the visit', async () => {
		// Arrange
		const { store, registration: registrationStore, visit, guest } = entry();

		await store.check();

		// Act
		await store.submit('es');

		// Assert
		expect(registrationStore.submit).toHaveBeenCalledWith('queue', null, 'es', { premarket: true });
		expect(visit.submit).toHaveBeenCalledWith(registration, 'event-1');
		expect(guest.markAsReturningVisitor).toHaveBeenCalled();
		expect(store.state).toBe('registered');
	});

	it('stays on the form when the registration is refused', async () => {
		// Arrange
		const { store, registration: registrationStore, visit } = entry();

		registrationStore.submit.mockResolvedValue({ kind: 'error' });
		await store.check();

		// Act
		await store.submit('en');

		// Assert
		expect(visit.submit).not.toHaveBeenCalled();
		expect(store.state).toBe('open');
	});

	it('does not submit before the premarket is known to be open', async () => {
		// Arrange
		const { store, registration: registrationStore } = entry('closed');

		await store.check();

		// Act
		await store.submit('en');

		// Assert
		expect(registrationStore.submit).not.toHaveBeenCalled();
	});
});
