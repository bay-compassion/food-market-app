import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
	HouseholdServiceEntry,
	HouseholdServiceSubmission,
} from '../services/household-service';
import { HouseholdServiceStore } from './household-service.store';

const eventId = 'event-1';

function entry(submission: HouseholdServiceSubmission): HouseholdServiceEntry {
	return {
		...submission,
		version: 1,
		createdBy: 'worker',
		updatedBy: 'worker',
		createdAt: '2026-11-01T12:00:00Z',
		updatedAt: '2026-11-01T12:00:00Z',
		voidedAt: null,
	};
}

function api() {
	return {
		householdServiceEntries: vi.fn().mockResolvedValue([]),
		recordHouseholdService: vi.fn(async (submission: HouseholdServiceSubmission) =>
			entry(submission),
		),
		correctHouseholdService: vi.fn(),
	};
}
beforeEach(() => sessionStorage.clear());

describe('HouseholdServiceStore', () => {
	it('reuses an uncertain operation across retries and navigation, then allows a new household', async () => {
		const client = api();

		client.recordHouseholdService.mockRejectedValueOnce(new Error('Connection lost after commit'));
		const first = new HouseholdServiceStore(eventId, client);

		await first.load();
		expect(await first.record(4)).toBe(false);
		const pending = first.pending;
		const reopened = new HouseholdServiceStore(eventId, client);

		await reopened.load();
		expect(reopened.pending).toEqual(pending);
		expect(await reopened.record(9)).toBe(true);
		expect(client.recordHouseholdService.mock.calls[1]?.[0]).toEqual(pending);
		expect(reopened.households).toBe(1);
		expect(reopened.members).toBe(4);
		expect(reopened.pending).toBeNull();
		await reopened.record(3);
		expect(client.recordHouseholdService.mock.calls[2]?.[0].id).not.toBe(pending?.id);
		expect(reopened.members).toBe(7);
	});

	it('does not send a second request while a save is pending', async () => {
		const client = api();
		let resolve!: (value: HouseholdServiceEntry) => void;

		client.recordHouseholdService.mockImplementationOnce(
			() =>
				new Promise((done) => {
					resolve = done;
				}),
		);
		const store = new HouseholdServiceStore(eventId, client);

		await store.load();
		const saved = store.record(2);

		expect(await store.record(2)).toBe(false);
		expect(client.recordHouseholdService).toHaveBeenCalledTimes(1);
		resolve(entry(store.pending!));
		await saved;
	});

	it('updates totals only after confirmed corrections and undo', async () => {
		const client = api();
		const original = entry({ id: 'household-1', marketEventId: eventId, householdSize: 5 });

		client.householdServiceEntries.mockResolvedValue([original]);
		const store = new HouseholdServiceStore(eventId, client);

		await store.load();
		client.correctHouseholdService.mockRejectedValueOnce(new Error('conflict'));
		expect(await store.correct(original, 3, false)).toBe(false);
		expect(store.members).toBe(5);
		const corrected = { ...original, householdSize: 3, version: 2 };

		client.correctHouseholdService.mockResolvedValueOnce(corrected);
		await store.correct(original, 3, false);
		expect(store.members).toBe(3);
		client.correctHouseholdService.mockResolvedValueOnce({
			...corrected,
			voidedAt: '2026-11-01T12:05:00Z',
			version: 3,
		});
		await store.correct(corrected, 3, true);
		expect(store.households).toBe(0);
		expect(store.members).toBe(0);
		expect(client.correctHouseholdService).toHaveBeenLastCalledWith(original.id, {
			version: 2,
			householdSize: 3,
			voided: true,
		});
	});
});
