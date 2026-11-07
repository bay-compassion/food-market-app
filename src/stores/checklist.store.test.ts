import { observable } from 'mobx';
import { afterEach, describe, expect, it } from 'vitest';

import { StorageKey, StorageService } from '../services/storage.service';
import { ChecklistStore } from './checklist.store';

type SessionFake = { currentState: { event: { id: string } | null } | null };
type AdminFake = { printStationOnline: boolean | null };

function sessionFor(id: string | null): SessionFake {
	return observable({ currentState: { event: id === null ? null : { id } } });
}

function createStore(
	session: SessionFake = sessionFor('session-a'),
	admin: AdminFake = observable({ printStationOnline: null }),
	storage = new StorageService(),
) {
	// The store reads only these fields; the fakes stand in for the real stores.
	return new ChecklistStore(session as never, admin, storage);
}

afterEach(() => {
	window.localStorage.clear();
});

describe('ChecklistStore', () => {
	it('ticks and unticks a step', () => {
		// Arrange
		const store = createStore();

		// Act
		store.toggle('room-place');
		store.toggle('room-power');
		store.toggle('room-power');

		// Assert
		expect(store.isTicked('room-place')).toBe(true);
		expect(store.isTicked('room-power')).toBe(false);
	});

	it('keeps ticks for the same session across a reload', () => {
		// Arrange
		createStore().toggle('room-place');

		// Act
		const reloaded = createStore();

		// Assert
		expect(reloaded.isTicked('room-place')).toBe(true);
	});

	it('starts a different session with nothing ticked', () => {
		// Arrange
		const session = sessionFor('session-a');
		const store = createStore(session);

		store.toggle('room-place');

		// Act
		session.currentState = { event: { id: 'session-b' } };

		// Assert
		expect(store.isTicked('room-place')).toBe(false);
	});

	it('replaces the last session’s ticks once one is made for a new session', () => {
		// Arrange
		const session = sessionFor('session-a');
		const storage = new StorageService();
		const store = createStore(session, undefined, storage);

		store.toggle('room-place');
		session.currentState = { event: { id: 'session-b' } };

		// Act
		store.toggle('room-power');

		// Assert
		expect(storage.get(StorageKey.CHECKLIST_PROGRESS)).toEqual({
			sessionId: 'session-b',
			steps: ['room-power'],
		});
	});

	it('turns ticking off, and keeps the stored ticks, while no session is known', () => {
		// Arrange
		createStore().toggle('room-place');
		const session: SessionFake = observable({ currentState: null });
		const store = createStore(session);

		// Act
		store.toggle('room-power');
		session.currentState = { event: { id: 'session-a' } };

		// Assert
		expect(store.canTick).toBe(true);
		expect(store.isTicked('room-place')).toBe(true);
		expect(store.isTicked('room-power')).toBe(false);
	});

	it('ticks the printing station’s step itself when the station is online', () => {
		// Arrange
		const admin: AdminFake = observable({ printStationOnline: false });
		const store = createStore(undefined, admin);
		const step = ChecklistStore.printStationOnlineStep;

		store.toggle(step);

		// Act
		const whileOffline = store.isTicked(step);

		admin.printStationOnline = true;

		// Assert
		expect(whileOffline).toBe(false);
		expect(store.isAutomatic(step)).toBe(true);
		expect(store.isTicked(step)).toBe(true);
	});

	it('leaves the printing station’s step to the worker when its status is unknown', () => {
		// Arrange
		const store = createStore();
		const step = ChecklistStore.printStationOnlineStep;

		// Act
		store.toggle(step);

		// Assert
		expect(store.isAutomatic(step)).toBe(false);
		expect(store.isTicked(step)).toBe(true);
	});

	it('counts the steps done in a group', () => {
		// Arrange
		const store = createStore();
		const steps = ['room-place', 'room-power', 'room-open'];

		store.toggle('room-place');
		store.toggle('room-open');

		// Act
		const progress = store.progress(steps);

		// Assert
		expect(progress).toEqual({ done: 2, total: 3 });
		expect(store.isComplete(steps)).toBe(false);
	});

	it('asks for a help topic again each time, until it has been shown', () => {
		// Arrange
		const store = createStore();

		store.reveal('certificate-warning');
		const first = store.revealRequest;

		// Act
		store.reveal('certificate-warning');
		const second = store.revealRequest;

		store.settleReveal();

		// Assert
		expect(second).toEqual({ topic: 'certificate-warning' });
		expect(second).not.toBe(first);
		expect(store.revealRequest).toBeNull();
	});

	it('ignores a stored record of the wrong shape', () => {
		// Arrange
		const storage = new StorageService();

		storage.set(StorageKey.CHECKLIST_PROGRESS, { sessionId: 'session-a', steps: 'room-place' });

		// Act
		const store = createStore(undefined, undefined, storage);

		// Assert
		expect(store.isTicked('room-place')).toBe(false);
	});
});
