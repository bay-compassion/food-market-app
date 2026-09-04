import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DemoGuest } from '../services/demo-preview';
import { StorageKey } from '../services/storage.service';
import { DemoPreviewSession, previewMarker } from './demo-preview-session';
import { DemoStore } from './demo.store';
import { RootStore } from './root.store';

const guest: DemoGuest = {
	id: 'demo-guest',
	firstName: 'Ada',
	lastName: 'Example',
	phone: '5105550123',
	locale: 'es',
	deviceToken: 'demo-device',
	household: null,
	visit: { id: 'demo-visit', token: 'demo-visit-token', status: 'waiting', queuePosition: 3 },
};

afterEach(() => {
	vi.restoreAllMocks();
	localStorage.clear();
	sessionStorage.clear();
});

describe('demo guest tabs', () => {
	it('persists guest state across refresh without changing normal browser identity or language', () => {
		// Arrange
		localStorage.setItem(StorageKey.GUEST_DEVICE_TOKEN, JSON.stringify('normal-device'));
		localStorage.setItem(StorageKey.LOCALE, 'en');
		const storage = new DemoPreviewSession();

		storage.seed(guest);
		const store = new RootStore({ browserStorage: storage, previewName: 'Ada Example' });

		// Act
		store.translations.setLanguage('ar');
		const refreshed = new RootStore({
			browserStorage: new DemoPreviewSession(),
			previewName: 'Ada Example',
		});

		// Assert
		expect(refreshed.guest.identity?.firstName).toBe('Ada');
		expect(refreshed.translations.locale).toBe('ar');
		expect(storage.getItem('bay-compassion.visit-token')).toBe('demo-visit-token');
		expect(localStorage.getItem(StorageKey.LOCALE)).toBe('en');
		expect(localStorage.getItem(StorageKey.GUEST_DEVICE_TOKEN)).toBe(
			JSON.stringify('normal-device'),
		);
		store[Symbol.dispose]();
		refreshed[Symbol.dispose]();
	});

	it('clears a prior visit and household when selecting a guest without them', () => {
		// Arrange
		const storage = new DemoPreviewSession();

		storage.seed(guest);
		// Act
		storage.seed({ ...guest, id: 'other', visit: null });
		// Assert
		expect(storage.getItem('bay-compassion.visit-token')).toBeNull();
		storage.end();
		expect(storage.length).toBe(0);
		expect(sessionStorage.getItem(previewMarker)).toBeNull();
	});

	it('replaces and persists rosters, hiding them for a different session', () => {
		// Arrange
		const demo = new DemoStore();

		demo.save({ marketEventId: 'first', guests: [guest] });
		// Act
		demo.save({ marketEventId: 'second', guests: [] });
		const restored = new DemoStore();

		// Assert
		expect(restored.forSession('first')).toBeNull();
		expect(restored.forSession('second')?.guests).toEqual([]);
	});

	it('keeps an explicitly ended scenario available while there is no active session', () => {
		// Arrange
		const demo = new DemoStore();

		// Act
		demo.save({ marketEventId: 'ended', guests: [guest] }, null);
		// Assert
		expect(new DemoStore().forSession(null)?.guests).toHaveLength(1);
		expect(demo.forSession('new-session')).toBeNull();
	});

	it('reports blocked popups and does not change this tab', () => {
		// Arrange
		vi.spyOn(window, 'open').mockReturnValue(null);
		const demo = new DemoStore();

		// Act
		demo.recordOpenResult(DemoPreviewSession.open(guest));
		// Assert
		expect(demo.openError).toBe(true);
		expect(sessionStorage.getItem(previewMarker)).toBeNull();
	});

	it('does not request notification configuration or enroll a preview browser', async () => {
		// Arrange
		const storage = new DemoPreviewSession();

		storage.seed(guest);
		const request = vi.spyOn(window, 'fetch');
		const store = new RootStore({ browserStorage: storage, previewName: 'Ada Example' });

		// Act
		await store.guest.initialize();
		await store.guest.enablePushNotifications('token');
		await store.guest.enableSmsNotifications(true);
		// Assert
		expect(request).not.toHaveBeenCalled();
		expect(store.guest.notificationSettingsLoaded).toBe(true);
		store[Symbol.dispose]();
	});
});
