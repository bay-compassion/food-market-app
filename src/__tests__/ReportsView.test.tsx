import { fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';

import { adminTranslations } from '../adminLocales';
import { ReportsView } from '../components/admin/ReportsView';
import type { ReportRow } from '../services/reports';
import { RootStoreProvider } from '../stores/react/store-context';
import { RootStore } from '../stores/root.store';

const t = adminTranslations.en;

function jsonResponse(rows: ReportRow[]) {
	return { ok: true, json: () => Promise.resolve({ rows }) } as Response;
}

function respondWith(rows: ReportRow[]) {
	return vi.fn(() => Promise.resolve(jsonResponse(rows)));
}

/** The URL and options one `fetch` call was made with. */
function callArgs(fetchMock: Mock, index: number) {
	const calls = fetchMock.mock.calls as [string, { headers: Record<string, string> }][];

	return calls[index < 0 ? calls.length + index : index]!;
}

function renderReports(fetchMock: Mock, canExport = true) {
	vi.stubGlobal('fetch', fetchMock);

	return render(
		<RootStoreProvider store={new RootStore()}>
			<ReportsView getAccessToken={() => Promise.resolve('token')} canExport={canExport} />
		</RootStoreProvider>,
	);
}

/** The screen fetches on mount, so every assertion waits for that first answer to land. */
function settled(fetchMock: Mock) {
	return waitFor(() => expect(fetchMock).toHaveBeenCalled());
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('ReportsView', () => {
	it('loads the session summary on open and renders its translated headings', async () => {
		const fetchMock = respondWith([
			{ sessionDate: '2026-03-04T17:00:00.000Z', capacity: 50, served: 48, fillRate: 96 },
		]);
		const { container } = renderReports(fetchMock);

		await waitFor(() => expect(container.querySelector('table')).not.toBeNull());

		const text = container.textContent!;

		expect(text).toContain(t.reportColumnLabels.sessionDate);
		expect(text).toContain(t.reportColumnLabels.fillRate);
		// Rendered through the locale formatter, not printed as the raw number the server sent.
		expect(text).toContain('96%');

		expect(callArgs(fetchMock, 0)[0]).toContain('report=session-summary');
	});

	it('sends the bearer token with the report request', async () => {
		const fetchMock = respondWith([]);

		renderReports(fetchMock);
		await settled(fetchMock);

		expect(callArgs(fetchMock, 0)[1].headers.Authorization).toBe('Bearer token');
	});

	it('reloads when a different report is chosen', async () => {
		const fetchMock = respondWith([]);
		const { container } = renderReports(fetchMock);

		await settled(fetchMock);

		fireEvent.change(container.querySelector('select')!, { target: { value: 'people-served' } });

		await waitFor(() => expect(callArgs(fetchMock, -1)[0]).toContain('report=people-served'));
	});

	it('says so when the range holds no sessions, rather than showing an empty table', async () => {
		const fetchMock = respondWith([]);
		const { container } = renderReports(fetchMock);

		await waitFor(() => expect(container.textContent).toContain(t.reportEmpty));

		expect(container.querySelector('table')).toBeNull();
	});

	it('refuses a backwards range without asking the server', async () => {
		const fetchMock = respondWith([]);
		const { container } = renderReports(fetchMock);

		await settled(fetchMock);
		fetchMock.mockClear();

		// The default range opens a year back, so this end date lands before the start.
		const toInput = container.querySelectorAll('input[type="date"]')[1]!;

		fireEvent.change(toInput, { target: { value: '2020-01-01' } });

		await waitFor(() => expect(container.textContent).toContain(t.reportRangeInvalid));
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('keeps the range inputs usable while a report is loading', () => {
		// Correcting a mistyped range is exactly when locking the inputs would hurt most.
		const { container } = renderReports(vi.fn(() => new Promise<Response>(() => {})));

		for (const input of container.querySelectorAll<HTMLInputElement>('input[type="date"]')) {
			expect(input.disabled).toBe(false);
		}
		expect(container.querySelector<HTMLSelectElement>('select')!.disabled).toBe(false);
	});

	it('ignores a slow answer that a newer range has already replaced', async () => {
		let resolveFirst: (value: Response) => void = () => {};
		const fetchMock = vi
			.fn()
			.mockImplementationOnce(() => new Promise<Response>((resolve) => (resolveFirst = resolve)))
			.mockImplementation(() => Promise.resolve(jsonResponse([{ served: 2 }])));
		const { container } = renderReports(fetchMock);

		await settled(fetchMock);

		fireEvent.change(container.querySelectorAll('input[type="date"]')[0]!, {
			target: { value: '2026-01-01' },
		});

		await waitFor(() => expect(container.textContent).toContain('2'));

		// The first request finally answers, describing the range the worker has already left.
		resolveFirst(jsonResponse([{ served: 999 }]));

		await waitFor(() => expect(container.textContent).toContain('2'));
		expect(container.textContent).not.toContain('999');
	});

	it('warns that the full export names guests, unlike the reports above it', async () => {
		const fetchMock = respondWith([]);
		const { container } = renderReports(fetchMock);

		await settled(fetchMock);

		expect(container.textContent).toContain(t.reportPrivacyNote);
		expect(container.textContent).toContain(t.reportExportVisits);
	});

	it('hides the export entirely from a worker who may not download it', async () => {
		const fetchMock = respondWith([]);
		const { container } = renderReports(fetchMock, false);

		await settled(fetchMock);

		expect(container.textContent).not.toContain(t.reportExportVisits);
		// The reports themselves stay available — only the file that names guests is withheld.
		expect(container.textContent).toContain(t.reportDownloadCsv);
	});

	it('shows the error message when the report request fails', async () => {
		const { container } = renderReports(vi.fn(() => Promise.resolve({ ok: false } as Response)));

		await waitFor(() => expect(container.textContent).toContain(t.error));
	});
});
