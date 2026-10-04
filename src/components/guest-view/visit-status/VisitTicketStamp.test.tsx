import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StorageKey, StorageService } from '../../../services/storage.service';
import { RootStoreProvider } from '../../../stores/react/store-context';
import { RootStore } from '../../../stores/root.store';
import { VisitTicketStamp } from './VisitTicketStamp';

/** A store over its own in-memory storage, so neither the identity nor a language leaks out. */
function storeWith(entries: [string, unknown][] = []): RootStore {
	const saved = new Map(entries.map(([key, value]) => [key, JSON.stringify(value)]));
	const storage = {
		getItem: (key: string) => saved.get(key) ?? null,
		setItem: (key: string, value: string) => void saved.set(key, value),
		removeItem: (key: string) => void saved.delete(key),
	} as Storage;

	return new RootStore({ storage: new StorageService(storage), browserStorage: storage });
}

/** A store whose guest is already identified on this device. */
function identifiedStore(): RootStore {
	return storeWith([
		[StorageKey.GUEST_DEVICE_TOKEN, 'device-token'],
		[StorageKey.GUEST_IDENTITY, { firstName: 'Ada', lastName: 'Lovelace', phone: '510-555-0123' }],
	]);
}

describe('VisitTicketStamp', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
		vi.setSystemTime(new Date(2026, 9, 3, 23, 59, 30));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows the guest’s name and today’s date as mm/dd/yyyy', () => {
		// Arrange
		const store = identifiedStore();

		// Act
		const { container } = render(
			<RootStoreProvider store={store}>
				<VisitTicketStamp />
			</RootStoreProvider>,
		);

		// Assert
		expect(container.textContent).toBe('Ada L10/03/2026');
	});

	it('moves to the new date at midnight', async () => {
		// Arrange
		const { container } = render(
			<RootStoreProvider store={identifiedStore()}>
				<VisitTicketStamp />
			</RootStoreProvider>,
		);

		// Act
		await act(() => vi.advanceTimersByTimeAsync(31_000));

		// Assert
		expect(container.textContent).toContain('10/04/2026');
	});

	it('keeps mm/dd/yyyy for an Arabic-reading guest', () => {
		// Arrange
		const store = identifiedStore();

		store.translations.setLanguage('ar');

		// Act
		const { container } = render(
			<RootStoreProvider store={store}>
				<VisitTicketStamp />
			</RootStoreProvider>,
		);

		// Assert
		expect(container.textContent).toContain('10/03/2026');
	});

	it('leaves the name out for a guest with no identity on this device', () => {
		// Arrange & Act
		const { container } = render(
			<RootStoreProvider store={storeWith()}>
				<VisitTicketStamp />
			</RootStoreProvider>,
		);

		// Assert
		expect(container.querySelector('strong')).toBeNull();
	});
});
