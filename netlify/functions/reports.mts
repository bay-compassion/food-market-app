import { Config } from '@netlify/functions';

import { csvFilename, toCsv } from '../../src/services/reportCsv.js';
import { isReportId, reportRangeBounds } from '../../src/services/reports.js';
import { requirePermission } from '../lib/auth.mjs';
import { runReport, runVisitExport, visitExportHeaders } from '../services/reports.mjs';

function error(message: string, status = 400) {
	return Response.json({ error: message }, { status });
}

export default async (request: Request) => {
	if (request.method !== 'GET') {
		return error('Method not allowed', 405);
	}

	const url = new URL(request.url);
	// The export names guests; the reports only count them, so they are gated apart.
	const isExport = url.searchParams.get('view') === 'export';
	const forbidden = await requirePermission(
		request,
		isExport ? 'export:guest-data' : 'read:reports',
	);
	if (forbidden) {
		return forbidden;
	}

	const from = url.searchParams.get('from') ?? '';
	const to = url.searchParams.get('to') ?? '';
	const range = reportRangeBounds(from, to);
	if (!range) {
		return error('Please provide a valid date range.');
	}

	if (isExport) {
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

export const config: Config = { path: '/api/reports' };
