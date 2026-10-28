import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { InstallEnvironment } from '../pwa/install-environment';
import { StorageKey, StorageService } from '../services/storage.service';
import { PwaInstallStore } from './pwa-install.store';
import { RootStore } from './root.store';

function setup({ ios = false, standalone = false, disabled = false } = {}) {
	const events = new EventTarget();
	const environment: InstallEnvironment = {
		platform: ios ? 'ios' : 'android',
		events,
		displayMode: null,
		isStandalone: standalone,
		canInstallOnIos: ios,
		prepareHandoff: vi.fn(() => true),
		clearHandoff: vi.fn(),
		registerServiceWorker: vi.fn(),
	};
	const store = new PwaInstallStore(new StorageService(), { environment, disabled });

	store.start();

	return { store, environment, events };
}

function installEvent(outcome: 'accepted' | 'dismissed' = 'accepted') {
	return Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
		prompt: vi.fn(() => Promise.resolve()),
		userChoice: Promise.resolve({ outcome }),
	});
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('PwaInstallStore', () => {
	it('captures a prompt early and only calls it after the guest asks', async () => {
		// Arrange
		const { store, events } = setup();
		const event = installEvent();

		// Act
		events.dispatchEvent(event);

		// Assert
		expect(event.defaultPrevented).toBe(true);
		expect(store.canOffer).toBe(true);
		expect(event.prompt).not.toHaveBeenCalled();
		await store.install();
		expect(event.prompt).toHaveBeenCalledOnce();
		await store.install();
		expect(event.prompt).toHaveBeenCalledOnce();
		store[Symbol.dispose]();
	});

	it('prepares the iOS handoff before showing instructions', async () => {
		// Arrange
		const { store, environment } = setup({ ios: true });

		// Act
		const result = await store.install();

		// Assert
		expect(result).toBe(true);
		expect(environment.prepareHandoff).toHaveBeenCalledOnce();
		expect(store.instructionsOpen).toBe(true);
		store.closeInstructions();
		expect(store.instructionsOpen).toBe(false);
		store[Symbol.dispose]();
	});

	it('keeps instructions closed if the visit cannot be handed off', async () => {
		// Arrange
		const { store, environment } = setup({ ios: true });

		vi.mocked(environment.prepareHandoff).mockReturnValue(false);

		// Act
		const result = await store.install();

		// Assert
		expect(result).toBe(false);
		expect(store.instructionsOpen).toBe(false);
		store[Symbol.dispose]();
	});

	it.each([{ standalone: true }, { disabled: true }])(
		'hides the offer in installed apps and previews: %o',
		async (options) => {
			// Arrange
			const { store, environment, events } = setup({ ios: true, ...options });

			// Act
			events.dispatchEvent(installEvent());
			await store.install();

			// Assert
			expect(store.canOffer).toBe(false);
			expect(environment.prepareHandoff).not.toHaveBeenCalled();
			store[Symbol.dispose]();
		},
	);

	it('does not invent an installation action for unsupported browsers', () => {
		// Arrange / Act
		const { store } = setup();

		// Assert
		expect(store.canOffer).toBe(false);
		store[Symbol.dispose]();
	});

	it('remembers Not Now for seven days', () => {
		// Arrange
		const { store } = setup({ ios: true });
		const now = Date.now();

		// Act
		store.dismiss();
		const returning = setup({ ios: true });

		// Assert
		expect(returning.store.canOffer).toBe(false);
		vi.spyOn(Date, 'now').mockReturnValue(now + 8 * 24 * 60 * 60_000);
		const later = setup({ ios: true });

		expect(later.store.canOffer).toBe(true);

		for (const instance of [store, returning.store, later.store]) {
			instance[Symbol.dispose]();
		}
	});

	it('expires dismissal when an existing app window resumes a week later', () => {
		// Arrange
		const { store, events } = setup({ ios: true });
		const now = Date.now();

		store.dismiss();
		expect(store.canOffer).toBe(false);
		vi.spyOn(Date, 'now').mockReturnValue(now + 8 * 24 * 60 * 60_000);

		// Act
		events.dispatchEvent(new Event('visibilitychange'));

		// Assert
		expect(store.canOffer).toBe(true);
		store[Symbol.dispose]();
	});

	it('remembers dismissal of the browser prompt too', async () => {
		// Arrange
		const { store, events } = setup();

		events.dispatchEvent(installEvent('dismissed'));

		// Act
		await store.install();

		// Assert
		expect(new StorageService().get(StorageKey.PWA_INSTALL_DISMISSED_UNTIL)).toBeGreaterThan(
			Date.now(),
		);
		store[Symbol.dispose]();
	});

	it('closes instructions and stops offering installation after appinstalled', async () => {
		// Arrange
		const { store, events } = setup({ ios: true });

		await store.install();

		// Act
		events.dispatchEvent(new Event('appinstalled'));

		// Assert
		expect(store.instructionsOpen).toBe(false);
		expect(store.canOffer).toBe(false);
		store[Symbol.dispose]();
	});

	it('reports prompt failures and cleans up its pending state', async () => {
		// Arrange
		const { store, events } = setup();
		const event = installEvent();

		event.prompt.mockRejectedValue(new Error('not available'));
		events.dispatchEvent(event);

		// Act
		const result = await store.install();

		// Assert
		expect(result).toBe(false);
		expect(store.isInstalling).toBe(false);
		store[Symbol.dispose]();
	});

	it('cleans up browser listeners when disposed', () => {
		// Arrange
		const { store, events } = setup();

		// Act
		store[Symbol.dispose]();
		events.dispatchEvent(installEvent());

		// Assert
		expect(store.canOffer).toBe(false);
	});

	it('clears a pending handoff when a guest forgets their identity', async () => {
		// Arrange
		localStorage.setItem(StorageKey.GUEST_DEVICE_TOKEN, JSON.stringify('guest'));
		const { environment, store } = setup();
		const root = new RootStore({ installation: { environment } });

		// Act
		await root.guest.forget();

		// Assert
		expect(environment.clearHandoff).toHaveBeenCalledOnce();
		root[Symbol.dispose]();
		store[Symbol.dispose]();
	});
});
