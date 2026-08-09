import { csvFilename, toCsv } from '../../src/services/reportCsv.js';
import { isReportId, reportRangeBounds } from '../../src/services/reports.js';
import { requireAuth0 } from '../lib/auth.js';
import { runReport, runVisitExport, visitExportHeaders } from '../services/reports.js';

function error(message: string, status = 400) {
	return Response.json({ error: message }, { status });
}

export default async (request: Request) => {
	if (request.method !== 'GET') {
		return error('Method not allowed', 405);
	}

	const unauthorized = await requireAuth0(request);
	if (unauthorized) {
		return unauthorized;
	}

	const url = new URL(request.url);
	const from = url.searchParams.get('from') ?? '';
	const to = url.searchParams.get('to') ?? '';
	const range = reportRangeBounds(from, to);
	if (!range) {
		return error('Please provide a valid date range.');
	}

	if (url.searchParams.get('view') === 'export') {
		const rows = await runVisitExport(range);

		return new Response(toCsv(visitExportHeaders, rows), {
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="${csvFilename('visits', from, to)}"`,
			},
		});
	}

	const id = url.searchParams.get('report');
	if (!isReportId(id)) {
		return error('Unknown report.');
	}

	return Response.json({ id, rows: await runReport(id, range) });
};

export const config = { path: '/api/reports' };
