import { describe, expect, it, vi } from 'vitest';

vi.mock('../../services/notifications.mjs', () => ({ deliverQueuedNotifications: vi.fn() }));

import { dispatchNotifications } from '../../functions/notification-dispatch.mjs';
import { deliverQueuedNotifications } from '../../services/notifications.mjs';

describe('notification dispatch workload', () => {
	it('uses one checkpointed workflow to drain every batch for a transition', async () => {
		vi.mocked(deliverQueuedNotifications)
			.mockResolvedValueOnce({ sent: 50, failed: 0, skipped: 0, processed: 100, hasMore: true })
			.mockResolvedValueOnce({ sent: 4, failed: 0, skipped: 0, processed: 8, hasMore: false });
		const run = vi.fn((_id: string, callback: () => Promise<unknown>) => callback());

		await dispatchNotifications({
			eventId: 'dispatch-1',
			eventData: {
				marketEventId: 'event-1',
				types: ['lottery_selected', 'lottery_not_selected'],
			},
			step: { run },
		} as never);

		expect(run).toHaveBeenNthCalledWith(1, 'deliver-batch-0', expect.any(Function));
		expect(run).toHaveBeenNthCalledWith(2, 'deliver-batch-1', expect.any(Function));
		expect(deliverQueuedNotifications).toHaveBeenCalledWith({
			claimId: 'dispatch-1',
			marketEventId: 'event-1',
			types: ['lottery_selected', 'lottery_not_selected'],
			limit: 50,
		});
	});
});
