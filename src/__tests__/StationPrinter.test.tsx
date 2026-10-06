import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PrintStationProvider } from '../components/print-station/print-station-context';
import { StationPrinter } from '../components/print-station/StationPrinter';
import type { NameTagPrintJob } from '../services/print-jobs';
import { PrintStationStore } from '../stores/print-station.store';

const maria: NameTagPrintJob = {
	id: '001791230000000-a',
	visitId: 'visit-1',
	firstName: 'Maria',
	lastInitial: 'S',
	queuePosition: 14,
	locale: 'es',
	requestedAt: '2026-10-05T18:00:00.000Z',
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe('StationPrinter', () => {
	it('prints each waiting tag at label size, then marks it printed', async () => {
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
		await waitFor(() => expect(complete).toHaveBeenCalledWith(maria.id));
		expect(print).toHaveBeenCalledOnce();
		expect(station.current).toBeNull();
	});
});
