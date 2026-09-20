import { describe, expect, it } from 'vitest';

import { SessionStatusEnum } from '../../src/services/sessionStateMachine.js';
import { StorageKey } from '../../src/services/storage.service.js';
import { SceneFixtures, stillsClock } from './scene-fixtures.mjs';
import type { StillStep } from './still-catalog.mjs';

function fixturesFor(overrides: Partial<StillStep> = {}, locale: 'en' | 'es' = 'en') {
	return new SceneFixtures({ id: 'scene', anchor: () => '', ...overrides }, locale);
}

describe('SceneFixtures', () => {
	it('gives a returning guest a language but no identity', () => {
		// Arrange
		const fixtures = fixturesFor({ guest: 'returning' }, 'es');

		// Act
		const { storage } = fixtures;

		// Assert
		expect(storage[StorageKey.LOCALE]).toBe('es');
		expect(storage[StorageKey.RETURNING_VISITOR]).toBe('true');
		expect(storage[StorageKey.GUEST_DEVICE_TOKEN]).toBeUndefined();
	});

	it('gives an identified guest a device token and a made-up name', () => {
		// Arrange
		const fixtures = fixturesFor({ guest: 'identified' });

		// Act
		const { storage } = fixtures;

		// Assert
		expect(storage[StorageKey.GUEST_DEVICE_TOKEN]).toBeDefined();
		expect(JSON.parse(storage[StorageKey.GUEST_IDENTITY] ?? '')).toMatchObject({
			firstName: 'Sample',
		});
	});

	it('holds a visit token only when the beat has a visit', () => {
		// Arrange
		const without = fixturesFor({ guest: 'identified' });
		const withVisit = fixturesFor({ guest: 'identified', visit: { status: 'waiting' } });

		// Act
		const keysWithout = Object.keys(without.storage);
		const keysWith = Object.keys(withVisit.storage);

		// Assert
		expect(keysWith.length).toBe(keysWithout.length + 1);
		expect(withVisit.visit).toMatchObject({ status: 'waiting', queuePosition: null });
		expect(without.visit).toBeNull();
	});

	it('reports no market event when none is scheduled', () => {
		// Arrange
		const fixtures = fixturesFor({ market: null });

		// Act
		const { market } = fixtures;

		// Assert
		expect(market.event).toBeNull();
	});

	it.each([
		[SessionStatusEnum.REGISTRATION_OPEN, true],
		[SessionStatusEnum.REGISTRATION_CLOSED, false],
		[SessionStatusEnum.SCHEDULED, false],
	])('puts the registration window of a %s market around now: %s', (status, containsNow) => {
		// Arrange
		const fixtures = fixturesFor({ market: status });

		// Act
		const { event } = fixtures.market;
		const now = stillsClock.getTime();
		const insideWindow =
			new Date(event?.registrationOpensAt ?? 0).getTime() <= now &&
			now < new Date(event?.registrationClosesAt ?? 0).getTime();

		// Assert
		expect(event?.status).toBe(status);
		expect(insideWindow).toBe(containsNow);
	});
});
