import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../test/dbStub.mjs';

vi.mock('../../db/index.mjs', () => ({ db }));
const { getCurrentEvent } = vi.hoisted(() => ({ getCurrentEvent: vi.fn() }));

vi.mock('./marketSession.mjs', () => ({ getCurrentEvent }));

import { premarketSessionFor, replaceCode } from './premarket-code.mjs';

const location = { id: 'location-1', name: 'Bay Point', timeZone: 'America/Los_Angeles' };
const session = {
	id: 'event-1',
	locationId: 'location-1',
	status: 'scheduled',
	registrationOpensAt: new Date('2026-07-18T16:00:00.000Z'),
	registrationClosesAt: new Date('2026-07-18T17:00:00.000Z'),
};

afterEach(() => {
	resetDbStub();
	vi.clearAllMocks();
});

describe('replaceCode', () => {
	it('retires the live code and makes a new one, recording who did it', async () => {
		// Arrange
		const now = new Date('2026-07-01T12:00:00.000Z');

		queueResult([]); // retire the live code
		queueResult([{ code: 'new-code', createdAt: now, createdByName: 'Sam' }]); // insert returning

		// Act
		const code = await replaceCode('location-1', { id: 'auth0|sam', name: 'Sam' }, now);

		// Assert
		expect(code).toEqual({ code: 'new-code', createdAt: now.toISOString(), createdByName: 'Sam' });
		const retired = db.update.mock.results[0]!.value as { set: ReturnType<typeof vi.fn> };

		expect(retired.set).toHaveBeenCalledWith({ replacedAt: now });
		const inserted = db.insert.mock.results[0]!.value as { values: ReturnType<typeof vi.fn> };

		expect(inserted.values.mock.calls[0]![0]).toMatchObject({
			locationId: 'location-1',
			code: expect.stringMatching(/^[\w-]{22}$/),
			createdById: 'auth0|sam',
			createdByName: 'Sam',
		});
	});
});

describe('premarketSessionFor', () => {
	it('opens the current session’s premarket on market day', async () => {
		// Arrange
		queueResult([{ locationId: 'location-1' }]);
		getCurrentEvent.mockResolvedValue(session);
		queueResult([location]);

		// Act
		const result = await premarketSessionFor('code', new Date('2026-07-18T15:00:00.000Z'));

		// Assert
		expect(result).toEqual({ marketEventId: 'event-1', open: true });
	});

	it('finds the session but reports it closed before market day', async () => {
		// Arrange
		queueResult([{ locationId: 'location-1' }]);
		getCurrentEvent.mockResolvedValue(session);
		queueResult([location]);

		// Act
		const result = await premarketSessionFor('code', new Date('2026-07-15T15:00:00.000Z'));

		// Assert
		expect(result).toEqual({ marketEventId: 'event-1', open: false });
	});

	it('knows nothing of an unknown or replaced code', async () => {
		// Arrange
		queueResult([]);

		// Act
		const result = await premarketSessionFor('code');

		// Assert
		expect(result).toBeNull();
		expect(getCurrentEvent).not.toHaveBeenCalled();
	});

	it('knows nothing when no session is coming up', async () => {
		// Arrange
		queueResult([{ locationId: 'location-1' }]);
		getCurrentEvent.mockResolvedValue(null);

		// Act
		const result = await premarketSessionFor('code');

		// Assert
		expect(result).toBeNull();
	});
});
