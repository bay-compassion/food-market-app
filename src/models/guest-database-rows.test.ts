import { describe, expect, it } from 'vitest';

import type { GuestRecordTotals, GuestSummary } from '../services/admin-api';
import { visitStatuses } from '../services/visitStateMachine';
import { adminVisitStatusLabels } from '../services/visitStatusLabels';
import { GuestDatabaseRows, languageLabel } from './guest-database-rows';

const statusLabels = adminVisitStatusLabels('en');
const noVisit = 'No visit';
const today = new Date('2026-11-26T12:00:00');

const noHistory: GuestRecordTotals = {
	visitCount: 0,
	servedCount: 0,
	noShowCount: 0,
	lastVisitDate: null,
	noteCount: 0,
	latestNoteCategory: null,
};

const unvisited: GuestSummary = {
	id: null,
	guestId: 'guest-without-visit',
	firstName: 'Ana',
	lastName: 'Reyes',
	pronunciation: null,
	phone: '(555) 987-6543',
	locale: 'tl',
	householdSize: null,
	queuePosition: null,
	priorityNumber: null,
	queueFront: null,
	queueOrder: null,
	calledAt: null,
	status: null,
	track: null,
	marketEventId: null,
	...noHistory,
};

function guest(overrides: Partial<Extract<GuestSummary, { status: string }>> = {}): GuestSummary {
	return {
		id: 'visit-1',
		guestId: 'guest-1',
		marketEventId: 'today',
		firstName: 'Maria',
		lastName: 'Santos',
		pronunciation: null,
		phone: '(555) 123-4567',
		householdSize: 4,
		locale: 'es',
		queuePosition: 1,
		priorityNumber: null,
		queueFront: false,
		queueOrder: 1,
		calledAt: null,
		status: 'waiting',
		track: 'lottery',
		...noHistory,
		visitCount: 3,
		servedCount: 2,
		lastVisitDate: '2026-11-26',
		...overrides,
	};
}

function rowsOf(guests: GuestSummary[]) {
	return new GuestDatabaseRows(guests, statusLabels, noVisit, 'today', today);
}

describe('GuestDatabaseRows', () => {
	it('flattens a guest into the values the grid sorts and filters on', () => {
		// Arrange
		const rows = rowsOf([guest({ noteCount: 2, latestNoteCategory: 'Escalate to Lead' })]);

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
			inSession: true,
			lastVisit: new Date('2026-11-26T00:00:00Z'),
			lastVisitLabel: 'Nov 26',
			visitCount: 3,
			noteCount: 2,
			latestNoteCategory: 'Escalate to Lead',
		});
	});

	it('keys a row by the guest, so a guest with many visits is one row', () => {
		// Arrange
		const rows = rowsOf([guest({ id: 'visit-9', guestId: 'guest-7', visitCount: 7 })]);

		// Act
		const [row] = rows.rows;

		// Assert
		expect(row!.id).toBe('guest-7');
	});

	it('keeps the guest on the row so an action knows who it is running against', () => {
		// Arrange
		const subject = guest({ id: 'visit-7' });
		const rows = rowsOf([subject]);

		// Act
		const [row] = rows.rows;

		// Assert
		expect(row!.guest).toBe(subject);
	});

	it('writes the year on a last visit from another year', () => {
		// Arrange
		const rows = rowsOf([guest({ lastVisitDate: '2025-03-04', marketEventId: 'old' })]);

		// Act
		const [row] = rows.rows;

		// Assert
		expect(row).toMatchObject({ inSession: false, lastVisitLabel: 'Mar 4, 2025' });
	});

	it('lists a guest with no visit under their guest id, as having no visit', () => {
		// Arrange
		const rows = rowsOf([guest(), unvisited]);

		// Act
		const [, row] = rows.rows;

		// Assert
		expect(row).toMatchObject({
			id: 'guest-without-visit',
			name: 'Ana Reyes',
			householdSize: null,
			status: null,
			statusLabel: noVisit,
			inSession: false,
			lastVisit: null,
			lastVisitLabel: noVisit,
			visitCount: 0,
		});
	});

	it('puts nobody in session between sessions', () => {
		// Arrange
		const rows = new GuestDatabaseRows([guest()], statusLabels, noVisit, null, today);

		// Act
		const [row] = rows.rows;

		// Assert
		expect(row!.inSession).toBe(false);
	});

	it('offers every status and no visit as filter options, not only the ones on screen', () => {
		// Arrange
		const rows = rowsOf([guest({ status: 'waiting' })]);

		// Act
		const options = rows.statusOptions;

		// Assert
		expect(options).toEqual([...visitStatuses.map((status) => statusLabels[status]), noVisit]);
	});

	it('offers every language as a filter option', () => {
		// Arrange
		const rows = rowsOf([guest({ locale: 'es' })]);

		// Act
		const options = rows.languageOptions;

		// Assert
		expect(options).toContain('English');
		expect(options).toContain('Vietnamese');
	});

	describe('matching', () => {
		const everyone = rowsOf([
			guest(),
			guest({
				id: 'visit-2',
				guestId: 'guest-2',
				firstName: 'Daniel',
				lastName: 'Brooks',
				status: 'not_placed',
			}),
			guest({
				id: 'visit-3',
				guestId: 'guest-3',
				firstName: 'Li',
				lastName: 'Chen',
				status: 'not_placed',
				marketEventId: 'last-week',
				noteCount: 1,
			}),
			unvisited,
		]);

		it('keeps only guests whose latest visit is in the open session for the session filter', () => {
			// Arrange
			const filter = 'in-session';

			// Act
			const names = everyone.matching(filter, '').map((row) => row.name);

			// Assert
			expect(names).toEqual(['Maria Santos', 'Daniel Brooks']);
		});

		it('keeps only guests the lottery did not place today for the not-placed filter', () => {
			// Arrange
			const filter = 'not-placed';

			// Act
			const names = everyone.matching(filter, '').map((row) => row.name);

			// Assert
			expect(names).toEqual(['Daniel Brooks']);
		});

		it('keeps only guests with a staff note for the notes filter', () => {
			// Arrange
			const filter = 'has-notes';

			// Act
			const names = everyone.matching(filter, '').map((row) => row.name);

			// Assert
			expect(names).toEqual(['Li Chen']);
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

describe('languageLabel', () => {
	it('names a language in English, which is what the admin screens read', () => {
		// Arrange, Act, Assert
		expect(languageLabel('fa')).toBe('Farsi');
		expect(languageLabel('zh')).toBe('Chinese');
	});
});
