import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PrintStationProvider } from '../components/print-station/print-station-context';
import { StationPrinter } from '../components/print-station/StationPrinter';
import type { NameTagPrintJob } from '../services/print-jobs';
import { PrintStationStore } from '../stores/print-station.store';

const maria: NameTagPrintJob = {
	id: '001791230000000-a',
	visitId: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd7f3a',
	firstName: 'Maria',
	lastInitial: 'S',
	pronunciation: null,
	queuePosition: 14,
	priorityNumber: null,
	locale: 'es',
	requestedAt: '2026-10-05T18:00:00.000Z',
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe('StationPrinter', () => {
	it('prints each waiting tag at label size, dated and referenced, then marks it printed', async () => {
		// Arrange
		const print = vi.spyOn(window, 'print').mockImplementation(() => {});
		const complete = vi.fn().mockResolvedValue(true);
		const station = new PrintStationStore({
			api: { printJobs: vi.fn().mockResolvedValue({ ok: true, jobs: [maria] }), complete },
		});

		await station.poll();

		// Act
		render(
			<PrintStationProvider value={station}>
				<StationPrinter />
			</PrintStationProvider>,
		);
		const label = document.body.querySelector('.name-tag-print .name-tag');

		// Assert
		expect(label?.textContent).toContain('Maria S.');
		expect(label?.textContent).toContain('Oct 5, 2026');
		expect(label?.querySelector('.reference-code')?.textContent).toBe('7F3A');
		await waitFor(() => expect(complete).toHaveBeenCalledWith(maria.id));
		expect(print).toHaveBeenCalledOnce();
		expect(station.current).toBeNull();
	});
});
