import { afterEach, describe, expect, it, vi } from 'vitest';

import { db } from '../test/dbStub.mjs';

const send = vi.fn();

vi.mock('../../db/index.mjs', () => ({ db }));

vi.mock('@netlify/async-workloads', () => ({
	AsyncWorkloadsClient: vi.fn(function AsyncWorkloadsClient() {
		return { send };
	}),
}));

import { requestNotificationDispatch } from './notificationDispatch.mjs';

afterEach(() => {
	vi.unstubAllEnvs();
	send.mockReset();
});

describe('requestNotificationDispatch', () => {
	it('queues nothing while notifications are disabled', async () => {
		// Arrange
		vi.stubEnv('NOTIFICATIONS_ENABLED', 'false');

		// Act
		const eventId = await requestNotificationDispatch({
			marketEventId: 'event-1',
			types: ['called'],
		});

		// Assert
		expect(eventId).toBeNull();
		expect(send).not.toHaveBeenCalled();
	});

	it('queues the dispatch event while notifications are enabled', async () => {
		// Arrange
		vi.stubEnv('NOTIFICATIONS_ENABLED', 'true');
		send.mockResolvedValue({
			sendStatus: 'succeeded',
			eventId: 'dispatch-1',
		});

		// Act
		const eventId = await requestNotificationDispatch({
			marketEventId: 'event-1',
			types: ['called'],
		});

		// Assert
		expect(eventId).toBe('dispatch-1');
		expect(send).toHaveBeenCalledWith('notification.dispatch', {
			data: { marketEventId: 'event-1', types: ['called'] },
		});
	});
});
