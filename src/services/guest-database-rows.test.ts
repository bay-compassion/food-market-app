import { describe, expect, it } from 'vitest';

import type { QueueGuest, UnvisitedGuest } from './admin-api';
import { GuestDatabaseRows, languageLabel } from './guest-database-rows';
import { visitStatuses } from './visitStateMachine';
import { adminVisitStatusLabels } from './visitStatusLabels';

const statusLabels = adminVisitStatusLabels('en');
const noVisit = 'No visit';

const unvisited: UnvisitedGuest = {
	id: null,
	guestId: 'guest-without-visit',
	firstName: 'Ana',
	lastName: 'Reyes',
	phone: '(555) 987-6543',
	locale: 'tl',
	householdSize: null,
	queuePosition: null,
	calledAt: null,
	status: null,
	marketEventId: null,
};

function guest(overrides: Partial<QueueGuest> = {}): QueueGuest {
	return {
		id: 'guest-1',
		firstName: 'Maria',
		lastName: 'Santos',
		phone: '(555) 123-4567',
		householdSize: 4,
		locale: 'es',
		queuePosition: 1,
		calledAt: null,
		status: 'waiting',
		...overrides,
	};
}

describe('GuestDatabaseRows', () => {
	it('flattens a guest into the values the grid sorts and filters on', () => {
		// Arrange
		const rows = new GuestDatabaseRows([guest()], statusLabels, noVisit);

		// Act
		const [row] = rows.rows;

		// Assert
		expect(row).toMatchObject({
			id: 'guest-1',
			name: 'Maria Santos',
			phone: '(555) 123-4567',
			householdSize: 4,
			language: 'Spanish',
			status: 'waiting',
			statusLabel: statusLabels.waiting,
		});
	});

	it('keeps the guest on the row so an action knows who it is running against', () => {
		// Arrange
		const subject = guest({ id: 'guest-7' });
		const rows = new GuestDatabaseRows([subject], statusLabels, noVisit);

		// Act
		const [row] = rows.rows;

		// Assert
		expect(row!.guest).toBe(subject);
	});

	it('lists a guest with no visit under their guest id, as having no visit', () => {
		// Arrange
		const rows = new GuestDatabaseRows([guest(), unvisited], statusLabels, noVisit);

		// Act
		const [, row] = rows.rows;

		// Assert
		expect(row).toMatchObject({
			id: 'guest-without-visit',
			name: 'Ana Reyes',
			householdSize: null,
			status: null,
			statusLabel: noVisit,
		});
	});

	it('offers every status and no visit as filter options, not only the ones on screen', () => {
		// Arrange
		const rows = new GuestDatabaseRows([guest({ status: 'waiting' })], statusLabels, noVisit);

		// Act
		const options = rows.statusOptions;

		// Assert
		expect(options).toEqual([...visitStatuses.map((status) => statusLabels[status]), noVisit]);
	});

	it('offers every language as a filter option', () => {
		// Arrange
		const rows = new GuestDatabaseRows([guest({ locale: 'es' })], statusLabels, noVisit);

		// Act
		const options = rows.languageOptions;

		// Assert
		expect(options).toContain('English');
		expect(options).toContain('Vietnamese');
	});
});

describe('languageLabel', () => {
	it('names a language in English, which is what the admin screens read', () => {
		// Arrange, Act, Assert
		expect(languageLabel('fa')).toBe('Farsi');
		expect(languageLabel('zh')).toBe('Chinese');
	});
});
