import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../test/dbStub.mjs';

vi.mock('../../db/index.mjs', () => ({ db }));
const { getCurrentEvent } = vi.hoisted(() => ({ getCurrentEvent: vi.fn() }));

vi.mock('./marketSession.mjs', () => ({ getCurrentEvent }));

import { currentPremarket } from './premarket-session.mjs';

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

describe('currentPremarket', () => {
	it('opens the current session’s premarket on market day', async () => {
		// Arrange
		getCurrentEvent.mockResolvedValue(session);
		queueResult([location]);

		// Act
		const result = await currentPremarket(new Date('2026-07-18T15:00:00.000Z'));

		// Assert
		expect(result).toEqual({ marketEventId: 'event-1', open: true });
	});

	it('finds the session but reports it closed before market day', async () => {
		// Arrange
		getCurrentEvent.mockResolvedValue(session);
		queueResult([location]);

		// Act
		const result = await currentPremarket(new Date('2026-07-15T15:00:00.000Z'));

		// Assert
		expect(result).toEqual({ marketEventId: 'event-1', open: false });
	});

	it('knows nothing when no session is coming up', async () => {
		// Arrange
		getCurrentEvent.mockResolvedValue(null);

		// Act
		const result = await currentPremarket();

		// Assert
		expect(result).toBeNull();
	});
});
