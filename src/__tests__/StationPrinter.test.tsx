import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { CheckInAppBridge } from '../components/print-station/check-in-app';
import { PrintStationProvider } from '../components/print-station/print-station-context';
import { StationPrinter } from '../components/print-station/StationPrinter';
import { NameTag } from '../models/name-tag';
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
	vi.useRealTimers();
	delete window.checkInApp;
});

function stationWith(job: NameTagPrintJob, complete = vi.fn().mockResolvedValue(true)) {
	return new PrintStationStore({
		api: { printJobs: vi.fn().mockResolvedValue({ ok: true, jobs: [job] }), complete },
	});
}

describe('StationPrinter', () => {
	it('prints each waiting tag at label size, dated and referenced, then marks it printed', async () => {
		// Arrange
		const print = vi.spyOn(window, 'print').mockImplementation(() => {});
		const complete = vi.fn().mockResolvedValue(true);
		const station = stationWith(maria, complete);

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

	it('prints through the desktop app at label size, and marks the tag printed only once it has', async () => {
		// Arrange
		let finishPrinting = () => {};
		const appPrint = vi.fn(
			() => new Promise<void>((resolve) => (finishPrinting = () => resolve())),
		);
		const app: CheckInAppBridge = { printer: { print: appPrint } };

		window.checkInApp = app;
		const browserPrint = vi.spyOn(window, 'print').mockImplementation(() => {});
		const complete = vi.fn().mockResolvedValue(true);
		const station = stationWith(maria, complete);

		await station.poll();

		// Act
		render(
			<PrintStationProvider value={station}>
				<StationPrinter />
			</PrintStationProvider>,
		);
		await waitFor(() => expect(appPrint).toHaveBeenCalledWith(NameTag.label));
		const beforeItFinished = station.current;

		finishPrinting();

		// Assert
		expect(beforeItFinished).toEqual(maria);
		await waitFor(() => expect(complete).toHaveBeenCalledWith(maria.id));
		expect(browserPrint).not.toHaveBeenCalled();
		expect(station.current).toBeNull();
	});

	it('tries the desktop app’s printer again when a print fails, rather than dropping the tag', async () => {
		// Arrange
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const appPrint = vi
			.fn<(label: typeof NameTag.label) => Promise<void>>()
			.mockRejectedValueOnce(new Error('Printer is off'))
			.mockResolvedValueOnce(undefined);
		const app: CheckInAppBridge = { printer: { print: appPrint } };

		window.checkInApp = app;
		const complete = vi.fn().mockResolvedValue(true);
		const station = stationWith(maria, complete);

		await station.poll();

		// Act
		render(
			<PrintStationProvider value={station}>
				<StationPrinter />
			</PrintStationProvider>,
		);
		await waitFor(() => expect(appPrint).toHaveBeenCalledOnce());
		await vi.advanceTimersByTimeAsync(3_000);

		// Assert
		await waitFor(() => expect(appPrint).toHaveBeenCalledTimes(2));
		await waitFor(() => expect(complete).toHaveBeenCalledWith(maria.id));
		expect(complete).toHaveBeenCalledOnce();
	});
});
