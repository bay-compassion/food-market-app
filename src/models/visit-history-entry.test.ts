import { describe, expect, it } from 'vitest';

import { adminTranslations } from '../adminLocales';
import type { VisitEvent } from '../services/visit-events';
import { VisitHistoryEntry } from './visit-history-entry';

const t = adminTranslations.en.queueDesk.history;

function entry(overrides: Partial<VisitEvent>): VisitHistoryEntry {
	return new VisitHistoryEntry(
		{
			id: 'event-1',
			kind: 'called',
			toStatus: 'called',
			actor: { kind: 'worker', id: 'auth0|worker', name: 'Matt' },
			details: {},
			createdAt: '2026-10-05T18:24:00.000Z',
			...overrides,
		},
		t,
	);
}

describe('VisitHistoryEntry', () => {
	it('names the worker who made the change', () => {
		// Arrange
		const called = entry({});

		// Act
		const line = [called.title, called.byline];

		// Assert
		expect(line).toEqual(['Called', 'By Matt']);
	});

	it('falls back to "a volunteer" for a worker whose sign-in carried no name', () => {
		// Arrange
		const called = entry({ actor: { kind: 'worker', id: 'auth0|worker', name: null } });

		// Act
		const byline = called.byline;

		// Assert
		expect(byline).toBe('By a volunteer');
	});

	it('says where a returned guest went in line', () => {
		// Arrange
		const entries = (['end', 'next'] as const).map((placement) =>
			entry({ kind: 'returned', toStatus: 'waiting', details: { placement } }),
		);

		// Act
		const titles = entries.map((each) => each.title);

		// Assert
		expect(titles).toEqual(['Returned to queue · to the back', 'Returned to queue · to the front']);
	});

	it('credits the lottery with the draw, and gives the place it drew', () => {
		// Arrange
		const drawn = entry({
			kind: 'drawn',
			toStatus: 'waiting',
			actor: { kind: 'system' },
			details: { queuePosition: 4 },
		});

		// Act
		const line = [drawn.title, drawn.byline];

		// Assert
		expect(line).toEqual(['Drawn in the lottery · #4', 'Lottery draw']);
	});

	it('explains a cancellation nobody made by hand', () => {
		// Arrange
		const ended = entry({
			kind: 'cancelled',
			toStatus: 'cancelled',
			actor: { kind: 'system' },
			details: { cause: 'session_ended' },
		});
		const byGuest = entry({ kind: 'cancelled', toStatus: 'cancelled', actor: { kind: 'guest' } });

		// Act
		const bylines = [ended.byline, byGuest.byline];

		// Assert
		expect(bylines).toEqual(['Session ended', 'By the guest']);
	});
});
