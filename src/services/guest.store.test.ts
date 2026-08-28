import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GuestStore } from './guest.store';
import type { GuestRegistrationInput, GuestSignupInput } from './guestVisitApi';
import { StorageKey, StorageService } from './storage.service';

const registration = { id: 'visit-1', status: 'registered' as const, visitToken: 'token-1' };
const signupInput: GuestSignupInput = {
	firstName: 'Ari',
	lastName: 'Guest',
	phone: '555-123-4567',
	locale: 'en',
};
const input: GuestRegistrationInput = {
	firstName: 'Ari',
	lastName: 'Guest',
	ageRange: '18-29',
	householdSize: 2,
	childrenCount: 0,
	seniorsCount: 0,
	phone: '555-123-4567',
	locale: 'en',
	marketEventId: 'event-1',
	answers: {},
	source: 'self' as const,
};

describe('GuestStore', () => {
	let storage: StorageService;

	beforeEach(() => {
		storage = new StorageService();
		vi.clearAllMocks();
	});

	describe('when `deviceToken` is not set', () => {
		beforeEach(() => {
			storage.remove(StorageKey.GUEST_DEVICE_TOKEN);
		});

		it('should recognize the guest as unregistered', async () => {
			// Arrange
			const store = new GuestStore({ storage });

			// Act
			await store.initialize();

			// Assert
			expect(store.isIdentified).toBe(false);
		});
	});

	describe('when `deviceToken` is set', () => {
		beforeEach(() => {
			storage.set(StorageKey.GUEST_DEVICE_TOKEN, 'device-token');
		});

		it('should recognize the guest as registered', async () => {
			// Arrange
			const request = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ pushSubscribed: false, smsConsented: false }),
			});
			const store = new GuestStore({ storage, request });

			// Act
			await store.initialize();

			// Assert
			expect(store.isIdentified).toBe(true);
			expect(request).toHaveBeenCalledWith('/api/notification-status', {
				headers: { Authorization: 'Bearer device-token' },
			});
		});

		it('loads persistent SMS consent during initialization', async () => {
			const request = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ pushSubscribed: false, smsConsented: true }),
			});
			const store = new GuestStore({ storage, request });

			await store.initialize();

			expect(store.smsState).toBe('enabled');
			expect(store.smsConsented).toBe(true);
		});
	});

	it('uses a saved device credential without replacing it', async () => {
		const register = vi.fn().mockResolvedValue(registration);
		const storage = {
			get: vi.fn().mockReturnValue('saved-device-token'),
			set: vi.fn(),
		};
		const store = new GuestStore({ storage, register });

		expect(store.isIdentified).toBe(true);
		await store.register(input);

		expect(register).toHaveBeenCalledWith({ ...input, deviceToken: 'saved-device-token' });
		expect(storage.set).toHaveBeenCalledWith(StorageKey.GUEST_IDENTITY, {
			firstName: 'Ari',
			lastName: 'Guest',
			phone: '555-123-4567',
		});
	});

	it('persists a device token issued by a successful registration', async () => {
		const register = vi
			.fn()
			.mockResolvedValue({ ...registration, deviceToken: 'new-device-token' });
		const storage = { get: vi.fn().mockReturnValue(null), set: vi.fn() };
		const store = new GuestStore({ storage, register });

		expect(store.isIdentified).toBe(false);
		await store.register(input);

		expect(register).toHaveBeenCalledWith({ ...input, deviceToken: null });
		expect(storage.set).toHaveBeenCalledWith(StorageKey.GUEST_DEVICE_TOKEN, 'new-device-token');
		expect(store.isIdentified).toBe(true);
		expect(store.identity).toEqual({
			firstName: 'Ari',
			lastName: 'Guest',
			phone: '555-123-4567',
		});
	});

	it('restores identity from browser storage without retrieving guest data', () => {
		const savedIdentity = { firstName: 'Ari', lastName: 'Guest', phone: '555-123-4567' };
		const storage: Pick<StorageService, 'get' | 'set'> = {
			get: vi.fn((key: StorageKey) =>
				key === StorageKey.GUEST_DEVICE_TOKEN ? 'saved-device-token' : savedIdentity,
			) as StorageService['get'],
			set: vi.fn(),
		};
		const register = vi.fn();

		const store = new GuestStore({ storage, register });

		expect(store.identity).toEqual(savedIdentity);
		expect(register).not.toHaveBeenCalled();
	});

	it('does not trust a locally stored identity without a device credential', () => {
		const storage: Pick<StorageService, 'get' | 'set'> = {
			get: vi.fn((key: StorageKey) =>
				key === StorageKey.GUEST_IDENTITY
					? { firstName: 'Ari', lastName: 'Guest', phone: '555-123-4567' }
					: null,
			) as StorageService['get'],
			set: vi.fn(),
		};

		const store = new GuestStore({ storage, register: vi.fn() });

		expect(store.isIdentified).toBe(false);
		expect(store.identity).toBeNull();
	});

	it('replaces a stale saved credential when the server issues a new one', async () => {
		const register = vi
			.fn()
			.mockResolvedValue({ ...registration, deviceToken: 'replacement-device-token' });
		const storage = {
			get: vi.fn().mockReturnValue('stale-device-token'),
			set: vi.fn(),
		};
		const store = new GuestStore({ storage, register });

		await store.register(input);

		expect(register).toHaveBeenCalledWith({ ...input, deviceToken: 'stale-device-token' });
		expect(storage.set).toHaveBeenCalledWith(
			StorageKey.GUEST_DEVICE_TOKEN,
			'replacement-device-token',
		);
	});

	it('does not identify the device when registration fails', async () => {
		const storage = { get: vi.fn().mockReturnValue(null), set: vi.fn() };
		const store = new GuestStore({
			storage,
			register: vi.fn().mockRejectedValue(new Error('unreachable')),
		});

		await expect(store.register(input)).rejects.toThrow('unreachable');
		expect(store.isIdentified).toBe(false);
		expect(storage.set).not.toHaveBeenCalled();
	});

	it('signs a first-time guest up and persists the issued device token', async () => {
		const signUp = vi
			.fn()
			.mockResolvedValue({ guestId: 'guest-1', deviceToken: 'new-device-token' });
		const storage = { get: vi.fn().mockReturnValue(null), set: vi.fn() };
		const store = new GuestStore({ storage, signUp });

		expect(store.isIdentified).toBe(false);
		await store.signUp(signupInput);

		expect(signUp).toHaveBeenCalledWith({ ...signupInput, deviceToken: null });
		expect(storage.set).toHaveBeenCalledWith(StorageKey.GUEST_DEVICE_TOKEN, 'new-device-token');
		expect(store.isIdentified).toBe(true);
		expect(store.identity).toEqual({
			firstName: 'Ari',
			lastName: 'Guest',
			phone: '555-123-4567',
		});
	});

	it('signs an already-identified guest up using the saved device credential', async () => {
		const signUp = vi.fn().mockResolvedValue({ guestId: 'guest-1' });
		const storage = { get: vi.fn().mockReturnValue('saved-device-token'), set: vi.fn() };
		const store = new GuestStore({ storage, signUp });

		await store.signUp(signupInput);

		expect(signUp).toHaveBeenCalledWith({ ...signupInput, deviceToken: 'saved-device-token' });
		expect(storage.set).toHaveBeenCalledWith(StorageKey.GUEST_IDENTITY, {
			firstName: 'Ari',
			lastName: 'Guest',
			phone: '555-123-4567',
		});
	});

	it('loads notification availability and an existing consent into store state', async () => {
		const request = vi.fn().mockImplementation((url: string) => {
			if (url === '/api/notification-status') {
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ pushSubscribed: false, smsConsented: true }),
				});
			}

			return Promise.resolve({
				ok: true,
				json: () =>
					Promise.resolve(
						url === '/api/sms-subscription'
							? { configured: true }
							: { configured: false, publicKey: null },
					),
			});
		});
		const storage = {
			get: vi.fn((key: StorageKey) =>
				key === StorageKey.GUEST_DEVICE_TOKEN ? 'saved-device-token'.padEnd(32, 'x') : null,
			),
			set: vi.fn(),
		};
		const store = new GuestStore({ request, storage });

		await store.loadNotificationSettings();

		expect(store.notificationSettingsLoaded).toBe(true);
		expect(store.smsConfigured).toBe(true);
		expect(store.smsConsented).toBe(true);
		expect(store.smsState).toBe('enabled');
		expect(request).toHaveBeenCalledWith('/api/notification-status', {
			headers: { Authorization: `Bearer ${'saved-device-token'.padEnd(32, 'x')}` },
		});
		expect(request).not.toHaveBeenCalledWith(
			'/api/sms-subscription',
			expect.objectContaining({ method: 'POST' }),
		);
	});

	it('restores SMS consent even when the channel is not configured', async () => {
		const request = vi.fn().mockImplementation((url: string) =>
			Promise.resolve({
				ok: true,
				json: () =>
					Promise.resolve(
						url === '/api/notification-status'
							? { pushSubscribed: false, smsConsented: true }
							: { configured: false, publicKey: null },
					),
			}),
		);
		const storage = {
			get: vi.fn((key: StorageKey) =>
				key === StorageKey.GUEST_DEVICE_TOKEN ? 'saved-device-token'.padEnd(32, 'x') : null,
			),
			set: vi.fn(),
		};
		const store = new GuestStore({ request, storage });

		await store.loadNotificationSettings();

		expect(store.smsConsented).toBe(true);
		expect(store.smsState).toBe('enabled');
		expect(request).not.toHaveBeenCalledWith(
			'/api/sms-subscription',
			expect.objectContaining({ method: 'POST' }),
		);
	});

	it('saves SMS consent and exposes the enabled notification state', async () => {
		const request = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
			if (url === '/api/sms-subscription' && options?.method === 'POST') {
				return Promise.resolve({ ok: true });
			}

			return Promise.resolve({
				ok: true,
				json: () =>
					Promise.resolve(
						url === '/api/sms-subscription'
							? { configured: true, subscribed: false }
							: { configured: false, publicKey: null },
					),
			});
		});
		const storage = {
			get: vi.fn((key: StorageKey) =>
				key === StorageKey.GUEST_DEVICE_TOKEN ? 'saved-device-token'.padEnd(32, 'x') : null,
			),
			set: vi.fn(),
		};
		const store = new GuestStore({ request, storage });

		await store.loadNotificationSettings();

		await store.enableSmsNotifications(true);

		expect(request).toHaveBeenCalledWith('/api/sms-subscription', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${'saved-device-token'.padEnd(32, 'x')}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ consent: true }),
		});
		expect(store.smsConsented).toBe(true);
		expect(store.smsState).toBe('enabled');
	});
});
