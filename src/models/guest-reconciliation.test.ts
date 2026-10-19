import { describe, expect, it } from 'vitest';

import { GuestReconciliation, type GuestIdentity } from './guest-reconciliation';

function identity(guestId: string, name: string, ...phones: string[]): GuestIdentity {
	const [firstName = '', lastName = ''] = name.split(' ');

	return { guestId, firstName, lastName, phones };
}

describe('GuestReconciliation', () => {
	it('treats a worker-added record and a self-registration with one name and phone as one person', () => {
		// Arrange
		const reconciliation = new GuestReconciliation([
			identity('desk', 'Ana López', '9255550100'),
			identity('phone', 'ana lopez', '9255550100'),
		]);

		// Act
		const samePerson = reconciliation.personOf('desk') === reconciliation.personOf('phone');

		// Assert
		expect(samePerson).toBe(true);
	});

	it('keeps two people who share a phone as one household', () => {
		// Arrange
		const reconciliation = new GuestReconciliation([
			identity('parent', 'Ana López', '9255550100'),
			identity('child', 'Luis López', '9255550100'),
		]);

		// Act
		const people = [reconciliation.personOf('parent'), reconciliation.personOf('child')];
		const households = [reconciliation.householdOf('parent'), reconciliation.householdOf('child')];

		// Assert
		expect(new Set(people).size).toBe(2);
		expect(new Set(households).size).toBe(1);
	});

	it('links records through a phone only an earlier visit was made with', () => {
		// Arrange
		const reconciliation = new GuestReconciliation([
			identity('old', 'Ana López', '9255550100'),
			identity('moved', 'Ana López', '9255550199', '9255550100'),
		]);

		// Act
		const samePerson = reconciliation.personOf('old') === reconciliation.personOf('moved');

		// Assert
		expect(samePerson).toBe(true);
	});

	it('does not merge people with the same name and different phones', () => {
		// Arrange
		const reconciliation = new GuestReconciliation([
			identity('one', 'Ana López', '9255550100'),
			identity('two', 'Ana López', '4155550100'),
		]);

		// Act
		const samePerson = reconciliation.personOf('one') === reconciliation.personOf('two');

		// Assert
		expect(samePerson).toBe(false);
	});

	it('hands out ids that carry no name or phone', () => {
		// Arrange
		const reconciliation = new GuestReconciliation([identity('g', 'Ana López', '9255550100')]);

		// Act
		const ids = [reconciliation.personOf('g'), reconciliation.householdOf('g')].join(' ');

		// Assert
		expect(ids).not.toMatch(/5550100|ana|l[oó]pez/i);
	});
});
