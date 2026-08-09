import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';

import { adminTranslations } from '../adminLocales';
import ReportsView from '../components/admin/ReportsView.vue';
import type { ReportRow } from '../services/reports';

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

function mountReports(fetchMock: Mock, canExport = true) {
	vi.stubGlobal('fetch', fetchMock);

	return mount(ReportsView, {
		props: { locale: 'en' as const, getAccessToken: () => Promise.resolve('token'), canExport },
	});
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('ReportsView', () => {
	it('loads the session summary on open and renders its translated headings', async () => {
		const fetchMock = respondWith([
			{ sessionDate: '2026-03-04T17:00:00.000Z', capacity: 50, served: 48, fillRate: 96 },
		]);
		const wrapper = mountReports(fetchMock);
		await flushPromises();

		const text = wrapper.text();
		expect(text).toContain(t.reportColumnLabels.sessionDate);
		expect(text).toContain(t.reportColumnLabels.fillRate);
		// Rendered through the locale formatter, not printed as the raw number the server sent.
		expect(text).toContain('96%');

		expect(callArgs(fetchMock, 0)[0]).toContain('report=session-summary');
	});

	it('sends the bearer token with the report request', async () => {
		const fetchMock = respondWith([]);
		mountReports(fetchMock);
		await flushPromises();

		expect(callArgs(fetchMock, 0)[1].headers.Authorization).toBe('Bearer token');
	});

	it('reloads when a different report is chosen', async () => {
		const fetchMock = respondWith([]);
		const wrapper = mountReports(fetchMock);
		await flushPromises();

		await wrapper.find('select').setValue('people-served');
		await flushPromises();

		expect(callArgs(fetchMock, -1)[0]).toContain('report=people-served');
	});

	it('says so when the range holds no sessions, rather than showing an empty table', async () => {
		const wrapper = mountReports(respondWith([]));
		await flushPromises();

		expect(wrapper.text()).toContain(t.reportEmpty);
		expect(wrapper.find('table').exists()).toBe(false);
	});

	it('refuses a backwards range without asking the server', async () => {
		const fetchMock = respondWith([]);
		const wrapper = mountReports(fetchMock);
		await flushPromises();
		fetchMock.mockClear();

		// The default range opens a year back, so this end date lands before the start.
		const toInput = wrapper.findAll('input[type="date"]')[1];
		await toInput!.setValue('2020-01-01');
		await flushPromises();

		expect(wrapper.text()).toContain(t.reportRangeInvalid);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('keeps the range inputs usable while a report is loading', async () => {
		// Correcting a mistyped range is exactly when locking the inputs would hurt most.
		const wrapper = mountReports(vi.fn(() => new Promise<Response>(() => {})));

		for (const input of wrapper.findAll('input[type="date"]')) {
			expect(input.attributes('disabled')).toBeUndefined();
		}
		expect(wrapper.find('select').attributes('disabled')).toBeUndefined();
	});

	it('ignores a slow answer that a newer range has already replaced', async () => {
		let resolveFirst: (value: Response) => void = () => {};
		const fetchMock = vi
			.fn()
			.mockImplementationOnce(() => new Promise<Response>((resolve) => (resolveFirst = resolve)))
			.mockImplementation(() => Promise.resolve(jsonResponse([{ served: 2 }])));
		const wrapper = mountReports(fetchMock);
		await flushPromises();

		await wrapper.findAll('input[type="date"]')[0]!.setValue('2026-01-01');
		await flushPromises();

		// The first request finally answers, describing the range the worker has already left.
		resolveFirst(jsonResponse([{ served: 999 }]));
		await flushPromises();

		expect(wrapper.text()).toContain('2');
		expect(wrapper.text()).not.toContain('999');
	});

	it('warns that the full export names guests, unlike the reports above it', async () => {
		const wrapper = mountReports(respondWith([]));
		await flushPromises();

		expect(wrapper.text()).toContain(t.reportPrivacyNote);
		expect(wrapper.text()).toContain(t.reportExportVisits);
	});

	it('hides the export entirely from a worker who may not download it', async () => {
		const wrapper = mountReports(respondWith([]), false);
		await flushPromises();

		expect(wrapper.text()).not.toContain(t.reportExportVisits);
		// The reports themselves stay available — only the file that names guests is withheld.
		expect(wrapper.text()).toContain(t.reportDownloadCsv);
	});

	it('shows the error message when the report request fails', async () => {
		const wrapper = mountReports(vi.fn(() => Promise.resolve({ ok: false } as Response)));
		await flushPromises();

		expect(wrapper.text()).toContain(t.error);
	});
});
