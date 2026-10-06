import { describe, expect, it, vi } from 'vitest';

import type { NameTagPrintJob } from '../services/print-jobs';
import type { PrintJobsResult } from '../services/print-station-api';
import { PrintStationStore } from './print-station.store';

function job(id: string, firstName = 'Maria'): NameTagPrintJob {
	return {
		id,
		visitId: `visit-${id}`,
		firstName,
		lastInitial: 'S',
		queuePosition: 14,
		locale: 'es',
		requestedAt: '2026-10-05T18:00:00.000Z',
	};
}

function stationReturning(...results: PrintJobsResult[]) {
	const printJobs = vi.fn<() => Promise<PrintJobsResult>>();
	const complete = vi.fn<(id: string) => Promise<boolean>>().mockResolvedValue(true);

	for (const result of results) {
		printJobs.mockResolvedValueOnce(result);
	}

	return {
		store: new PrintStationStore({ api: { printJobs, complete }, now: () => 1_000 }),
		printJobs,
		complete,
	};
}

describe('PrintStationStore', () => {
	it('is loading until it first reaches the server', () => {
		// Arrange
		const { store } = stationReturning();

		// Assert
		expect(store.isLoading).toBe(true);
		expect(store.current).toBeNull();
	});

	it('prints waiting tags one at a time, in the order they came', async () => {
		// Arrange
		const { store } = stationReturning({ ok: true, jobs: [job('a'), job('b', 'Linh')] });

		// Act
		await store.poll();
		const first = store.current?.id;

		await store.printed(store.current!);

		// Assert
		expect(first).toBe('a');
		expect(store.current?.id).toBe('b');
		expect(store.recent.map(({ job }) => job.id)).toEqual(['a']);
		expect(store.checkedAt).toBe(1_000);
	});

	it('does not queue a tag twice when the server hands it back again', async () => {
		// Arrange
		const { store } = stationReturning(
			{ ok: true, jobs: [job('a')] },
			{ ok: true, jobs: [job('a'), job('b')] },
		);

		// Act
		await store.poll();
		await store.poll();

		// Assert
		expect(store.waitingCount).toBe(2);
	});

	it('never reprints a tag whose removal failed, and keeps trying to remove it', async () => {
		// Arrange
		const { store, complete } = stationReturning(
			{ ok: true, jobs: [job('a')] },
			{ ok: true, jobs: [job('a')] },
		);

		complete.mockResolvedValueOnce(false);
		await store.poll();

		// Act
		await store.printed(store.current!);
		await store.poll();

		// Assert
		expect(store.current).toBeNull();
		expect(complete.mock.calls.map(([id]) => id)).toEqual(['a', 'a']);
	});

	it('reports why it cannot reach the server, and clears it on recovery', async () => {
		// Arrange
		const { store } = stationReturning({ ok: false, failure: 'forbidden' }, { ok: true, jobs: [] });

		// Act
		await store.poll();
		const whileFailing = store.failure;

		await store.poll();

		// Assert
		expect(whileFailing).toBe('forbidden');
		expect(store.failure).toBeNull();
	});
});
