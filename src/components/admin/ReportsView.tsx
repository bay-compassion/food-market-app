import styled from '@emotion/styled';
import { Button } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';

import { adminTranslations } from '../../adminLocales';
import { csvFilename, toCsv } from '../../services/reportCsv';
import { reportCsvRows } from '../../services/reportFormat';
import {
	defaultReportRange,
	reportColumns,
	reportRangeBounds,
	type ReportId,
	type ReportRow,
} from '../../services/reports';
import { ReportFilters } from './ReportFilters';
import { ReportTable } from './ReportTable';

export type ReportsViewProps = {
	getAccessToken: () => Promise<string>;
	/** Whether this worker may download the export that names guests. */
	canExport: boolean;
};

const Section = styled.section`
	.report-actions {
		display: flex;
		justify-content: flex-end;
		margin-top: 18px;
	}

	.privacy-note {
		margin-top: 12px;
		padding: 12px 14px;
		border-radius: var(--radius-sm);
		background: #fff1d8;
		color: #7a4b00;
		line-height: 1.5;
	}
`;

function download(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');

	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}

/**
 * The reporting screen. It owns its own fetching rather than pushing that up to `AdminDashboard`,
 * because nothing else on the admin side reads or writes report data — keeping it here is what
 * stops the dashboard container from growing another five pieces of state.
 */
export function ReportsView({ getAccessToken, canExport }: ReportsViewProps) {
	const t = adminTranslations.en;
	const [range] = useState(defaultReportRange);
	const [selectedReport, setSelectedReport] = useState<ReportId>('session-summary');
	const [from, setFrom] = useState(range.from);
	const [to, setTo] = useState(range.to);
	const [rows, setRows] = useState<ReportRow[]>([]);
	const [isBusy, setIsBusy] = useState(false);
	const [feedback, setFeedback] = useState('');

	const columns = reportColumns[selectedReport];
	const isRangeValid = reportRangeBounds(from, to) !== null;

	/**
	 * Which request the screen is currently waiting on. Changing the range fires a new query
	 * without cancelling the last one, and the two can come back in either order — this makes sure
	 * a slower earlier answer cannot overwrite the range the worker is actually looking at.
	 */
	const latestRequest = useRef(0);

	const authHeaders = useCallback(
		async () => ({ Authorization: `Bearer ${await getAccessToken()}` }),
		[getAccessToken],
	);

	const loadReport = useCallback(async () => {
		if (reportRangeBounds(from, to) === null) {
			// Abandon whatever is in flight: its answer describes a range the worker has already left.
			latestRequest.current += 1;
			setRows([]);
			setIsBusy(false);
			setFeedback(t.reportRangeInvalid);

			return;
		}

		const requestId = (latestRequest.current += 1);

		setIsBusy(true);
		setFeedback('');

		try {
			const params = new URLSearchParams({ from, to });

			params.set('report', selectedReport);
			const response = await fetch(`/api/reports?${params}`, { headers: await authHeaders() });

			if (!response.ok) {
				throw new Error('report');
			}

			const payload = (await response.json()) as { rows?: ReportRow[] };

			// A body without rows is a broken answer, not an empty report — say so rather than
			// rendering it as "no sessions in this range", which would read as a fact about the data.
			if (!Array.isArray(payload.rows)) {
				throw new Error('report');
			}

			if (requestId !== latestRequest.current) {
				return;
			}

			setRows(payload.rows);
		} catch {
			if (requestId !== latestRequest.current) {
				return;
			}

			setRows([]);
			setFeedback(t.error);
		} finally {
			if (requestId === latestRequest.current) {
				setIsBusy(false);
			}
		}
	}, [authHeaders, from, selectedReport, t.error, t.reportRangeInvalid, to]);

	useEffect(() => {
		void loadReport();
	}, [loadReport]);

	/** Built from what is already on screen, so the file matches the table the worker is looking at. */
	function downloadReportCsv() {
		const headers = columns.map((column) => t.reportColumnLabels[column.key]);
		const csv = toCsv(headers, reportCsvRows(columns, rows, t.reportValueLabels));

		download(
			new Blob([csv], { type: 'text/csv;charset=utf-8' }),
			csvFilename(selectedReport, from, to),
		);
	}

	/** The full visit-level export, which the server builds because it is far more than the screen holds. */
	async function downloadVisitExport() {
		if (!isRangeValid) {
			setFeedback(t.reportRangeInvalid);

			return;
		}

		setIsBusy(true);
		setFeedback('');

		try {
			const params = new URLSearchParams({ from, to });

			params.set('view', 'export');
			const response = await fetch(`/api/reports?${params}`, { headers: await authHeaders() });

			if (!response.ok) {
				throw new Error('export');
			}

			download(await response.blob(), csvFilename('visits', from, to));
		} catch {
			setFeedback(t.error);
		} finally {
			setIsBusy(false);
		}
	}

	return (
		<>
			<Section className="admin-section settings-card">
				{/* Deliberately not disabled while a report loads: correcting a range you have just
				    mistyped is the moment you least want the inputs taken away from you. */}
				<ReportFilters
					selectedReport={selectedReport}
					onSelectedReportChange={setSelectedReport}
					from={from}
					onFromChange={setFrom}
					to={to}
					onToChange={setTo}
				/>

				{feedback ? (
					<p className="admin-feedback" role="status">
						{feedback}
					</p>
				) : null}

				{rows.length ? (
					<ReportTable columns={columns} rows={rows} />
				) : !isBusy && !feedback ? (
					<p className="empty-state">{t.reportEmpty}</p>
				) : null}

				<div className="report-actions">
					<Button type="button" disabled={isBusy || !rows.length} onClick={downloadReportCsv}>
						{t.reportDownloadCsv}
					</Button>
				</div>
			</Section>

			{/* Hidden outright rather than shown disabled: a worker without the permission has no way
			    to get it themselves, so offering the button would only be a dead end. */}
			{canExport ? (
				<Section className="admin-section action-card">
					<h2>{t.reportExportVisits}</h2>
					<p>{t.reportExportVisitsHelp}</p>
					<p className="privacy-note">{t.reportPrivacyNote}</p>
					<div className="report-actions">
						<Button type="button" disabled={isBusy} onClick={() => void downloadVisitExport()}>
							{t.reportDownloadCsv}
						</Button>
					</div>
				</Section>
			) : null}
		</>
	);
}
