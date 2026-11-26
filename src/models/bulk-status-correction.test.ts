import { describe, expect, it } from 'vitest';

import type { QueueGuest } from '../services/admin-api.ts';
import type { VisitStatus } from '../services/visitStateMachine.ts';
import { BulkStatusCorrection } from './bulk-status-correction.ts';

function visit(id: string, status: VisitStatus): QueueGuest {
	return {
		id,
		guestId: `guest-${id}`,
		firstName: 'Ana',
		lastName: 'Reyes',
		pronunciation: null,
		phone: '5105550100',
		householdSize: 2,
		locale: 'en',
		queuePosition: null,
		priorityNumber: null,
		queueFront: false,
		queueOrder: null,
		calledAt: null,
		status,
		track: 'lottery',
	};
}

describe('BulkStatusCorrection', () => {
	it('offers every status at least one visit can move to', () => {
		// Arrange
		const bulk = new BulkStatusCorrection([visit('a', 'served'), visit('b', 'no_show')]);

		// Act
		const targets = bulk.targets;

		// Assert
		expect(targets).toEqual(['served', 'not_placed', 'no_show', 'cancelled']);
	});

	it('leaves out the one status every visit already has', () => {
		// Arrange
		const bulk = new BulkStatusCorrection([visit('a', 'served'), visit('b', 'served')]);

		// Act
		const targets = bulk.targets;

		// Assert
		expect(targets).not.toContain('served');
	});

	it('splits the visits into those a correction changes and those already there', () => {
		// Arrange
		const served = visit('a', 'served');
		const noShow = visit('b', 'no_show');
		const bulk = new BulkStatusCorrection([served, noShow]);

		// Act
		const eligible = bulk.eligible('served');
		const unchanged = bulk.unchanged('served');

		// Assert
		expect(eligible).toEqual([noShow]);
		expect(unchanged).toEqual([served]);
	});
});
