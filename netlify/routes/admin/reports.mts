import { csvFilename, toCsv } from '../../../src/services/reportCsv.js';
import { isReportId, reportRangeBounds } from '../../../src/services/reports.js';
import { withPermission, type AdminEnv } from '../../lib/http-auth.mjs';
import { createRouter, jsonError, methodNotAllowed, routeHandler } from '../../lib/http.mjs';
import { runReport, runVisitExport, visitExportHeaders } from '../../services/reports.mjs';

export const reportRoutes = createRouter<AdminEnv>();

reportRoutes.get(
	'/reports',
	(context, next) =>
		withPermission(context.req.query('view') === 'export' ? 'export:guest-data' : 'read:reports')(
			context,
			next,
		),
	async (context) => {
		const url = new URL(context.req.url);
		// The export names guests; the reports only count them, so they are gated apart.
		const isExport = url.searchParams.get('view') === 'export';
		const from = url.searchParams.get('from') ?? '';
		const to = url.searchParams.get('to') ?? '';
		const range = reportRangeBounds(from, to);

		if (!range) {
			return jsonError('Please provide a valid date range.');
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
			return jsonError('Unknown report.');
		}

		return Response.json({ id, rows: await runReport(id, range) });
	},
);
reportRoutes.all('/reports', methodNotAllowed);

export default routeHandler(createRouter().route('/api/admin', reportRoutes));
