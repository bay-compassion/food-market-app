import { beforeEach, describe, expect, it } from 'vitest';

import { StorageKey, StorageService } from './storage.service';

describe('StorageService', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	describe('get()', () => {
		it('should return null when the key has never been set', () => {
			// Arrange
			const service = new StorageService();

			// Act & Assert
			expect(service.get(StorageKey.GUEST_DEVICE_TOKEN)).toBeNull();
		});

		it('should return null when the stored value is not valid JSON', () => {
			// Arrange
			const service = new StorageService();

			localStorage.setItem(StorageKey.GUEST_DEVICE_TOKEN, 'not-json');

			// Act & Assert
			expect(service.get(StorageKey.GUEST_DEVICE_TOKEN)).toBeNull();
		});
	});

	describe('set()', () => {
		it('should set the value for the given key', () => {
			// Arrange
			const service = new StorageService();

			// Act
			service.set(StorageKey.GUEST_DEVICE_TOKEN, 'test-token');

			// Assert
			expect(service.get(StorageKey.GUEST_DEVICE_TOKEN)).toBe('test-token');
		});

		it('should store the value as JSON', () => {
			// Arrange
			const service = new StorageService();

			// Act
			service.set(StorageKey.GUEST_DEVICE_TOKEN, 'test-token');

			// Assert
			expect(localStorage.getItem(StorageKey.GUEST_DEVICE_TOKEN)).toBe(
				JSON.stringify('test-token'),
			);
		});

		it('should overwrite a previously set value', () => {
			// Arrange
			const service = new StorageService();

			service.set(StorageKey.GUEST_DEVICE_TOKEN, 'first-token');

			// Act
			service.set(StorageKey.GUEST_DEVICE_TOKEN, 'second-token');

			// Assert
			expect(service.get(StorageKey.GUEST_DEVICE_TOKEN)).toBe('second-token');
		});

		it('should not affect the value stored under a different key', () => {
			// Arrange
			const service = new StorageService();

			// Act
			service.set(StorageKey.GUEST_DEVICE_TOKEN, 'test-token');
			service.set(StorageKey.GUEST_IDENTITY, 'test-identity');

			// Assert
			expect(service.get(StorageKey.GUEST_DEVICE_TOKEN)).toBe('test-token');
			expect(service.get(StorageKey.GUEST_IDENTITY)).toBe('test-identity');
		});
	});

	describe('remove()', () => {
		it('should remove the value for the given key', () => {
			// Arrange
			const service = new StorageService();

			service.set(StorageKey.GUEST_DEVICE_TOKEN, 'test-token');

			// Act
			service.remove(StorageKey.GUEST_DEVICE_TOKEN);

			// Assert
			expect(service.get(StorageKey.GUEST_DEVICE_TOKEN)).toBeNull();
		});

		it('should not affect the value stored under a different key', () => {
			// Arrange
			const service = new StorageService();

			service.set(StorageKey.GUEST_DEVICE_TOKEN, 'test-token');
			service.set(StorageKey.GUEST_IDENTITY, 'test-identity');

			// Act
			service.remove(StorageKey.GUEST_DEVICE_TOKEN);

			// Assert
			expect(service.get(StorageKey.GUEST_IDENTITY)).toBe('test-identity');
		});
	});

	describe('clear()', () => {
		it('should remove every stored value', () => {
			// Arrange
			const service = new StorageService();

			service.set(StorageKey.GUEST_DEVICE_TOKEN, 'test-token');
			service.set(StorageKey.GUEST_IDENTITY, 'test-identity');

			// Act
			service.clear();

			// Assert
			expect(service.get(StorageKey.GUEST_DEVICE_TOKEN)).toBeNull();
			expect(service.get(StorageKey.GUEST_IDENTITY)).toBeNull();
		});
	});
});
