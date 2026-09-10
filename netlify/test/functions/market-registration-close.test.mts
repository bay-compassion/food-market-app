import { afterEach, describe, expect, it, vi } from 'vitest';

import { db, queueResult, resetDbStub } from '../dbStub.mjs';

vi.mock('../../../db/index.mjs', () => ({ db }));
vi.mock('../../services/marketSession.mjs', () => ({ getCurrentEvent: vi.fn() }));

import { closeRegistrationOnSchedule } from '../../functions/market-registration-close.mjs';
import { getCurrentEvent } from '../../services/marketSession.mjs';

afterEach(() => {
	resetDbStub();
	vi.mocked(getCurrentEvent).mockReset();
});

describe('scheduled registration close workload', () => {
	it('advances the session when the scheduled window is still current', async () => {
		const closesAt = new Date('2026-09-09T18:00:00.000Z');

		queueResult([{ status: 'registration_open', registrationClosesAt: closesAt }]);

		await closeRegistrationOnSchedule({
			eventData: {
				marketEventId: 'event-1',
				expectedRegistrationClosesAt: closesAt.toISOString(),
			},
		} as never);

		expect(getCurrentEvent).toHaveBeenCalledTimes(1);
	});

	it('ignores an event superseded by a registration-window edit', async () => {
		queueResult([
			{
				status: 'registration_open',
				registrationClosesAt: new Date('2026-09-09T19:00:00.000Z'),
			},
		]);

		await closeRegistrationOnSchedule({
			eventData: {
				marketEventId: 'event-1',
				expectedRegistrationClosesAt: '2026-09-09T18:00:00.000Z',
			},
		} as never);

		expect(getCurrentEvent).not.toHaveBeenCalled();
	});
});
