import { describe, expect, it, vi } from 'vitest';

import { PremarketEntryStore } from './premarket-entry.store';

const registration = {
	id: 'visit-1',
	status: 'served' as const,
	visitToken: 'visit-token',
	marketEventId: 'event-1',
};

function entry(code: string | null = 'printed-code-123456', status = 'open' as const) {
	const options = {
		code,
		registration: { submit: vi.fn().mockResolvedValue({ kind: 'registered', registration }) },
		visit: { submit: vi.fn() },
		checkStatus: vi.fn().mockResolvedValue(status),
	};

	return { store: new PremarketEntryStore(options), ...options };
}

describe('PremarketEntryStore', () => {
	it('says so when the address carried no code, without asking the server', async () => {
		// Arrange
		const { store, checkStatus } = entry(null);

		// Act
		await store.check();

		// Assert
		expect(store.state).toBe('missing');
		expect(checkStatus).not.toHaveBeenCalled();
	});

	it('takes on what the server says about the code', async () => {
		// Arrange
		const { store } = entry(undefined, 'closed' as never);

		// Act
		await store.check();

		// Assert
		expect(store.state).toBe('closed');
	});

	it('registers for the premarket with the scanned code and keeps the visit', async () => {
		// Arrange
		const { store, registration: registrationStore, visit } = entry();

		await store.check();

		// Act
		await store.submit('es');

		// Assert
		expect(registrationStore.submit).toHaveBeenCalledWith('queue', null, 'es', {
			premarketCode: 'printed-code-123456',
		});
		expect(visit.submit).toHaveBeenCalledWith(registration, 'event-1');
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

	it('does not submit before the code is known to be open', async () => {
		// Arrange
		const { store, registration: registrationStore } = entry(undefined, 'closed' as never);

		await store.check();

		// Act
		await store.submit('en');

		// Assert
		expect(registrationStore.submit).not.toHaveBeenCalled();
	});
});
