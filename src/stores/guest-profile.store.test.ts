import { describe, expect, it, vi } from 'vitest';

import { adminTranslations } from '../adminLocales.ts';
import type { GuestProfileRecord, RelatedGuestRecord } from '../models/guest-profile.ts';
import { AdminRequestError } from '../services/admin-api.ts';
import type { VisitEvent } from '../services/visit-events.ts';
import { GuestProfileStore, type GuestProfileApi } from './guest-profile.store.ts';
import { NotificationStore } from './notification.store.ts';

function record(guestId: string): GuestProfileRecord {
	return {
		guestId,
		firstName: 'Maria',
		lastName: 'Lopez',
		pronunciation: null,
		phone: '(415) 555-0142',
		locale: 'es',
		createdAt: '2025-03-12T17:00:00.000Z',
		onPhone: true,
		textAlerts: true,
		visits: [],
	};
}

function setup(
	getGuestProfile: GuestProfileApi['getGuestProfile'],
	listVisitEvents: GuestProfileApi['listVisitEvents'] = async () => [],
	listRelatedGuests: GuestProfileApi['listRelatedGuests'] = async () => [],
) {
	const notifications = new NotificationStore();
	const error = vi.spyOn(notifications, 'error');
	const store = new GuestProfileStore(
		{ getGuestProfile, listVisitEvents, listRelatedGuests },
		notifications,
	);

	return { store, error };
}

const called: VisitEvent = {
	id: 'event-1',
	kind: 'called',
	toStatus: 'called',
	actor: { kind: 'worker', id: 'auth0|jamie', name: 'Jamie' },
	details: {},
	createdAt: '2026-11-26T18:48:00.000Z',
};

describe('GuestProfileStore', () => {
	it('loads the guest the route names', async () => {
		// Arrange
		const { store } = setup(async (guestId) => record(guestId));

		// Act
		await store.load('guest-1');

		// Assert
		expect(store.profile?.guestId).toBe('guest-1');
		expect(store.loadFailed).toBe(false);
	});

	it('keeps the profile on screen while it reloads the same guest', async () => {
		// Arrange
		let resolve: (value: GuestProfileRecord) => void = () => {};
		const getGuestProfile = vi
			.fn<GuestProfileApi['getGuestProfile']>()
			.mockResolvedValueOnce(record('guest-1'))
			.mockImplementationOnce(() => new Promise((done) => (resolve = done)));
		const { store } = setup(getGuestProfile);

		await store.load('guest-1');

		// Act
		const reload = store.load('guest-1');

		// Assert
		expect(store.profile?.guestId).toBe('guest-1');
		resolve(record('guest-1'));
		await reload;
	});

	it('drops a profile that arrives after the guest was closed', async () => {
		// Arrange
		let resolve: (value: GuestProfileRecord) => void = () => {};
		const { store } = setup(() => new Promise((done) => (resolve = done)));
		const load = store.load('guest-1');

		// Act
		store.close();
		resolve(record('guest-1'));
		await load;

		// Assert
		expect(store.profile).toBeNull();
	});

	it('says why it could not load, with the server’s reason when it gave one', async () => {
		// Arrange
		const { store, error } = setup(async () => {
			throw new AdminRequestError('guest_profile', 'Guest not found.');
		});

		// Act
		await store.load('missing');

		// Assert
		expect(store.loadFailed).toBe(true);
		expect(error).toHaveBeenCalledWith('Guest not found.');
	});

	it('falls back to its own words when the server gave no reason', async () => {
		// Arrange
		const { store, error } = setup(async () => {
			throw new Error('network');
		});

		// Act
		await store.load('guest-1');

		// Assert
		expect(error).toHaveBeenCalledWith(adminTranslations.en.guestProfile.loadFailed);
	});

	it('opens a visit and reads its history', async () => {
		// Arrange
		const listVisitEvents = vi.fn(async () => [called]);
		const { store } = setup(async (guestId) => record(guestId), listVisitEvents);

		await store.load('guest-1');

		// Act
		store.toggleVisit('visit-1');
		await vi.waitFor(() => expect(store.openVisitHistory).not.toBeNull());

		// Assert
		expect(store.openVisitId).toBe('visit-1');
		expect(store.openVisitHistory).toEqual([called]);
		expect(listVisitEvents).toHaveBeenCalledWith('visit-1');
	});

	it('closes the open visit when it is opened again', async () => {
		// Arrange
		const { store } = setup(async (guestId) => record(guestId));

		store.toggleVisit('visit-1');

		// Act
		store.toggleVisit('visit-1');

		// Assert
		expect(store.openVisitId).toBeNull();
		expect(store.openVisitHistory).toBeNull();
	});

	it('shows no history for a visit until its own has loaded', async () => {
		// Arrange
		let resolve: (events: VisitEvent[]) => void = () => {};
		const listVisitEvents = vi
			.fn<GuestProfileApi['listVisitEvents']>()
			.mockResolvedValueOnce([called])
			.mockImplementationOnce(() => new Promise((done) => (resolve = done)));
		const { store } = setup(async (guestId) => record(guestId), listVisitEvents);

		store.toggleVisit('visit-1');
		await vi.waitFor(() => expect(store.openVisitHistory).not.toBeNull());

		// Act
		store.toggleVisit('visit-2');

		// Assert
		expect(store.openVisitHistory).toBeNull();
		resolve([]);
	});

	it('reads the records linked to the open guest', async () => {
		// Arrange
		const linked: RelatedGuestRecord = {
			guestId: 'guest-2',
			firstName: 'Maria',
			lastName: 'Lopez',
			phone: '(415) 555-0142',
			createdAt: '2025-06-04T17:00:00.000Z',
			visitCount: 1,
			lastVisitDate: '2025-06-04',
			relation: 'same-person',
		};
		const listRelatedGuests = vi.fn(async () => [linked]);
		const { store } = setup(async (guestId) => record(guestId), undefined, listRelatedGuests);

		await store.load('guest-1');

		// Act
		await store.loadRelated();

		// Assert
		expect(listRelatedGuests).toHaveBeenCalledWith('guest-1');
		expect(store.related).toEqual([linked]);
	});

	it('forgets the linked records when another guest opens', async () => {
		// Arrange
		const { store } = setup(async (guestId) => record(guestId));

		await store.load('guest-1');
		await store.loadRelated();

		// Act
		await store.load('guest-2');

		// Assert
		expect(store.related).toBeNull();
	});

	it('says so when the linked records could not be read', async () => {
		// Arrange
		const { store } = setup(
			async (guestId) => record(guestId),
			undefined,
			async () => {
				throw new Error('network');
			},
		);

		await store.load('guest-1');

		// Act
		await store.loadRelated();

		// Assert
		expect(store.relatedFailed).toBe(true);
		expect(store.related).toBeNull();
	});
});
