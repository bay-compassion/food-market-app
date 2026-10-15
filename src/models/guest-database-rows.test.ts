import { describe, expect, it } from 'vitest';

import type { QueueGuest, UnvisitedGuest } from '../services/admin-api';
import { visitStatuses } from '../services/visitStateMachine';
import { adminVisitStatusLabels } from '../services/visitStatusLabels';
import { GuestDatabaseRows, languageLabel } from './guest-database-rows';

const statusLabels = adminVisitStatusLabels('en');
const noVisit = 'No visit';

const unvisited: UnvisitedGuest = {
	id: null,
	guestId: 'guest-without-visit',
	firstName: 'Ana',
	lastName: 'Reyes',
	pronunciation: null,
	staffNotes: null,
	phone: '(555) 987-6543',
	locale: 'tl',
	householdSize: null,
	queuePosition: null,
	priorityNumber: null,
	queueFront: null,
	queueOrder: null,
	calledAt: null,
	status: null,
	marketEventId: null,
};

function guest(overrides: Partial<QueueGuest> = {}): QueueGuest {
	return {
		id: 'guest-1',
		guestId: 'guest-record-1',
		firstName: 'Maria',
		lastName: 'Santos',
		pronunciation: null,
		staffNotes: null,
		phone: '(555) 123-4567',
		householdSize: 4,
		locale: 'es',
		queuePosition: 1,
		priorityNumber: null,
		queueFront: false,
		queueOrder: 1,
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

	describe('matching', () => {
		const everyone = new GuestDatabaseRows(
			[
				guest(),
				guest({ id: 'guest-2', firstName: 'Daniel', lastName: 'Brooks', status: 'not_placed' }),
				unvisited,
			],
			statusLabels,
			noVisit,
		);

		it('keeps only guests with a visit today for the session filter', () => {
			// Arrange
			const filter = 'in-session';

			// Act
			const names = everyone.matching(filter, '').map((row) => row.name);

			// Assert
			expect(names).toEqual(['Maria Santos', 'Daniel Brooks']);
		});

		it('keeps only guests the lottery did not place for the not-placed filter', () => {
			// Arrange
			const filter = 'not-placed';

			// Act
			const names = everyone.matching(filter, '').map((row) => row.name);

			// Assert
			expect(names).toEqual(['Daniel Brooks']);
		});

		it('finds a name regardless of case', () => {
			// Arrange
			const search = '  reyes ';

			// Act
			const names = everyone.matching('all', search).map((row) => row.name);

			// Assert
			expect(names).toEqual(['Ana Reyes']);
		});

		it('finds a phone number by its digits, whatever the punctuation', () => {
			// Arrange
			const search = '987 6543';

			// Act
			const names = everyone.matching('all', search).map((row) => row.name);

			// Assert
			expect(names).toEqual(['Ana Reyes']);
		});
	});
});
