import { csvFilename, toCsv } from '../../../src/services/reportCsv.js';
import { isReportId, reportRangeBounds } from '../../../src/services/reports.js';
import { requirePermission } from '../../lib/auth.mjs';
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
			const canSeeOdds =
				(await requirePermission(
					context.req.raw,
					'read:stewardship',
					context.get('permissions'),
				)) === null;
			// Dropped here rather than hidden in a screen, so the download itself can't carry it.
			const oddsColumn = canSeeOdds ? -1 : visitExportHeaders.indexOf('lottery_weight');
			const keep = <T,>(row: T[]) => row.filter((_, index) => index !== oddsColumn);

			return new Response(toCsv(keep(visitExportHeaders), rows.map(keep)), {
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

		// Odds are for stewards, even counted: this report is the one that reads by weight.
		if (id === 'lottery-outcomes') {
			const forbidden = await requirePermission(
				context.req.raw,
				'read:stewardship',
				context.get('permissions'),
			);

			if (forbidden) {
				return forbidden;
			}
		}

		return Response.json({ id, rows: await runReport(id, range) });
	},
);
reportRoutes.all('/reports', methodNotAllowed);

export default routeHandler(createRouter().route('/api/admin', reportRoutes));
