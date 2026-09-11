import { afterEach, describe, expect, it, vi } from 'vitest';

import type { GuestClaimResult } from '../services/guestVisitApi';
import { StorageKey, StorageService } from '../services/storage.service';
import { GuestClaimStore, type GuestClaimStoreOptions } from './guest-claim.store';
import { GuestStore } from './guest.store';
import { VisitStore } from './visit.store';

const visitTokenKey = 'bay-compassion.visit-token';
const claimToken = 'claim-token-shown-as-a-qr-code-1234567890abcdef';
const claimed: GuestClaimResult = {
	deviceToken: 'device-token-for-this-phone',
	identity: { firstName: 'Ada', lastName: 'Lovelace', phone: '510-555-0123' },
	visit: {
		id: 'visit-7',
		marketEventId: 'event-1',
		status: 'waiting',
		visitToken: 'visit-token-7',
	},
};

function memoryStorage(): Storage {
	const values = new Map<string, string>();

	return {
		get length() {
			return values.size;
		},
		clear: () => values.clear(),
		getItem: (key) => values.get(key) ?? null,
		key: (index) => Array.from(values.keys())[index] ?? null,
		removeItem: (key) => values.delete(key),
		setItem: (key, value) => values.set(key, value),
	};
}

/** A phone, optionally already holding somebody's identity and visit. */
function phoneWith(
	redeem: NonNullable<GuestClaimStoreOptions['redeem']>,
	previous?: { visitToken: string },
) {
	const browserStorage = memoryStorage();
	const storage = new StorageService(browserStorage);

	if (previous) {
		storage.set(StorageKey.GUEST_DEVICE_TOKEN, 'someone-elses-device-token');
		storage.set(StorageKey.GUEST_IDENTITY, {
			firstName: 'Bea',
			lastName: 'Before',
			phone: '510-555-0999',
		});
		browserStorage.setItem(visitTokenKey, previous.visitToken);
	}

	const guest = new GuestStore({ storage });

	guest.notificationsDisabled = true;

	const visit = new VisitStore(
		{ session: { currentState: null } },
		{
			storage: browserStorage,
			lookupCurrentVisit: vi.fn().mockResolvedValue({ found: false, reason: 'unreachable' }),
		},
	);
	const claim = new GuestClaimStore(guest, visit, { redeem });

	return { claim, guest, visit, storage, browserStorage };
}

afterEach(() => {
	vi.useRealTimers();
});

describe('GuestClaimStore', () => {
	it('makes this phone the device for the claimed guest and their visit', async () => {
		// Arrange
		vi.useFakeTimers();
		const { claim, guest, visit, browserStorage } = phoneWith(vi.fn().mockResolvedValue(claimed));

		// Act
		const succeeded = await claim.redeem(claimToken);

		// Assert
		expect(succeeded).toBe(true);
		expect(guest.deviceId).toBe('device-token-for-this-phone');
		expect(guest.displayedName).toBe('Ada L');
		expect(visit.currentVisit).toMatchObject({ id: 'visit-7', status: 'waiting' });
		expect(browserStorage.getItem(visitTokenKey)).toBe('visit-token-7');
		expect(claim.state).toBe('idle');
	});

	it('drops the visit this phone held before when the claimed guest has none today', async () => {
		// Arrange
		vi.useFakeTimers();
		const { claim, visit, browserStorage } = phoneWith(
			vi.fn().mockResolvedValue({ ...claimed, visit: null }),
			{ visitToken: 'someone-elses-visit-token' },
		);

		// Act
		await claim.redeem(claimToken);

		// Assert
		expect(visit.currentVisit).toBeNull();
		expect(browserStorage.getItem(visitTokenKey)).toBeNull();
	});

	it('warns before replacing an identity already saved on this phone', () => {
		// Arrange
		const { claim } = phoneWith(vi.fn(), { visitToken: 'someone-elses-visit-token' });

		// Act
		const warns = claim.replacesExistingData;

		// Assert
		expect(warns).toBe(true);
	});

	it('has nothing to warn about on a phone with nothing saved', () => {
		// Arrange
		const { claim } = phoneWith(vi.fn());

		// Act
		const warns = claim.replacesExistingData;

		// Assert
		expect(warns).toBe(false);
	});

	it('leaves this phone exactly as it was when the code is refused', async () => {
		// Arrange
		const { claim, guest, browserStorage } = phoneWith(
			vi.fn().mockRejectedValue(new Error('Guest claim failed')),
			{ visitToken: 'someone-elses-visit-token' },
		);

		// Act
		const succeeded = await claim.redeem(claimToken);

		// Assert
		expect(succeeded).toBe(false);
		expect(claim.state).toBe('failed');
		expect(guest.deviceId).toBe('someone-elses-device-token');
		expect(guest.displayedName).toBe('Bea B');
		expect(browserStorage.getItem(visitTokenKey)).toBe('someone-elses-visit-token');
	});
});
