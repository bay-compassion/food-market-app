import { describe, expect, it, vi } from 'vitest';

import type { ScheduleApi } from '../services/schedule-api';
import type { SchedulePayload, ScheduleSessionPayload } from '../services/schedule-payload';
import type { MarketSessionStore } from './market-session.store';
import { ScheduleStore } from './schedule.store';

// Tuesday 2026-09-22, 5 AM Pacific.
const now = new Date('2026-09-22T12:00:00.000Z');

const pattern = {
	id: 'pattern-1',
	// Saturdays.
	startsOn: '2026-09-19',
	registrationOpensAt: '10:30',
	registrationDurationMinutes: 60,
	capacity: 30,
	lotteryDelayMinutes: null,
	autoCloseAfterMinutes: 720,
	questions: [],
};

function session(overrides: Partial<ScheduleSessionPayload> = {}): ScheduleSessionPayload {
	return {
		id: 'session-1',
		status: 'scheduled',
		recurrencePatternId: 'pattern-1',
		// Saturday 2026-09-26, 10:30 AM Pacific.
		registrationOpensAt: '2026-09-26T17:30:00.000Z',
		registrationClosesAt: '2026-09-26T18:30:00.000Z',
		capacity: 30,
		lotteryDelayMinutes: null,
		autoCloseAfterMinutes: 720,
		lotteryDrawsAt: null,
		autoClosesAt: '2026-09-27T05:30:00.000Z',
		hasVisits: false,
		questions: [],
		...overrides,
	};
}

function payload(overrides: Partial<SchedulePayload> = {}): SchedulePayload {
	return {
		location: { id: 'location-1', name: 'The Bay Church', timeZone: 'America/Los_Angeles' },
		pattern,
		sessions: [session()],
		...overrides,
	};
}

async function loadedStore(data: SchedulePayload, api: Partial<ScheduleApi> = {}) {
	const store = new ScheduleStore(
		{ load: vi.fn().mockResolvedValue(data), ...api } as unknown as ScheduleApi,
		{ sendCommand: vi.fn().mockResolvedValue(true), error: null } as unknown as MarketSessionStore,
		() => now,
	);

	await store.load();

	return store;
}

describe('ScheduleStore', () => {
	it('lists the pattern row first, then the unfinished session', async () => {
		// Arrange
		const store = await loadedStore(payload());

		// Act
		const rows = store.rows;

		// Assert
		expect(rows.map((row) => row.statusLabel)).toEqual(['Recurring', 'Pending']);
	});

	it('filters to a date’s session, or to the pattern on a date only it covers', async () => {
		// Arrange
		const store = await loadedStore(payload());

		// Act
		const rowsOn = (date: string) => {
			store.selectDate(date);

			return { labels: store.visibleRows.map((row) => row.statusLabel), id: store.selectedRowId };
		};
		const sessionDate = rowsOn('2026-09-26').labels;
		const { labels: patternDate, id: patternRowId } = rowsOn('2026-10-03');
		const emptyDate = rowsOn('2026-10-04').labels;

		// Assert
		expect(sessionDate).toEqual(['Pending']);
		expect(patternDate).toEqual(['Recurring']);
		expect(patternRowId).toBe('pattern:pattern-1');
		expect(emptyDate).toEqual([]);
	});

	it('marks the session’s date filled and later pattern dates hollow', async () => {
		// Arrange
		const store = await loadedStore(payload());

		// Act
		const { sessions, projected } = store.pipDates;

		// Assert
		expect([...sessions]).toEqual(['2026-09-26']);
		expect([...projected]).toEqual([]);

		// Act: the next month.
		store.setVisibleMonth('2026-10-15');

		// Assert
		expect([...store.pipDates.projected]).toEqual([
			'2026-10-03',
			'2026-10-10',
			'2026-10-17',
			'2026-10-24',
			'2026-10-31',
		]);
	});

	it('projects from today when there is no session, never into the past', async () => {
		// Arrange
		const store = await loadedStore(payload({ sessions: [] }));

		// Act
		const projected = [...store.pipDates.projected];

		// Assert
		expect(projected).toEqual(['2026-09-26']);
		expect(store.rows[0]!.actions).toContain('create_next_session');
	});

	it.each([
		['nothing is unfinished', [], null],
		['the pattern’s unjoined Pending session can be replaced', [session()], null],
		['a session is active', [session({ status: 'registration_open' })], 'active-session'],
		['a one-off session is pending', [session({ recurrencePatternId: null })], 'pending-session'],
		['someone joined the Pending session', [session({ hasVisits: true })], 'pending-session'],
	] as const)('when %s, a one-off session is blocked by: %s', async (_case, sessions, expected) => {
		// Arrange
		const store = await loadedStore(payload({ sessions: [...sessions] }));

		// Act
		const block = store.oneOffBlock;

		// Assert
		expect(block).toBe(expected);
	});

	it('prefills an edit with the session’s local date and times', async () => {
		// Arrange
		const store = await loadedStore(payload());

		// Act
		const input = store.sessionInputFor('session-1');

		// Assert
		expect(input).toMatchObject({
			date: '2026-09-26',
			registrationOpensAt: '10:30',
			registrationDurationMinutes: 60,
		});
	});

	it('keeps the previous schedule and records the server’s reason when a write is refused', async () => {
		// Arrange
		const store = await loadedStore(payload(), {
			addSession: vi.fn().mockRejectedValue(new Error('Another session is already scheduled.')),
		});

		// Act
		const saved = await store.addOneOff({ ...pattern, date: '2026-09-23' });

		// Assert
		expect(saved).toBe(false);
		expect(store.error).toBe('Another session is already scheduled.');
		expect(store.rows).toHaveLength(2);
		expect(store.isBusy).toBe(false);
	});

	it('starts the Pending session through the session store, then reloads', async () => {
		// Arrange
		const load = vi.fn().mockResolvedValue(payload());
		const store = await loadedStore(payload(), { load });

		// Act
		const started = await store.startNow();

		// Assert
		expect(started).toBe(true);
		expect(load).toHaveBeenCalledTimes(2);
	});
});
