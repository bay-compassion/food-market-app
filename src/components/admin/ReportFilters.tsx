import styled from '@emotion/styled';

import { adminTranslations } from '../../adminLocales';
import { reportIds, type ReportId } from '../../services/reports';

export type ReportFiltersProps = {
	selectedReport: ReportId;
	onSelectedReportChange: (report: ReportId) => void;
	from: string;
	onFromChange: (from: string) => void;
	to: string;
	onToChange: (to: string) => void;
};

const Filters = styled.div`
	display: grid;
	gap: 15px;

	.report-description {
		color: var(--color-text-subtle);
		line-height: 1.5;
	}

	@media (min-width: 860px) {
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		align-items: end;

		.report-description {
			grid-column: 1 / -1;
		}
	}
`;

/** Which report to run, and over what dates. */
export function ReportFilters({
	selectedReport,
	onSelectedReportChange,
	from,
	onFromChange,
	to,
	onToChange,
}: ReportFiltersProps) {
	const t = adminTranslations.en;

	return (
		<Filters className="report-filters">
			<label className="report-picker">
				{t.reports}
				<select
					value={selectedReport}
					onChange={(event) => onSelectedReportChange(event.target.value as ReportId)}
				>
					{reportIds.map((id) => (
						<option key={id} value={id}>
							{t.reportNames[id]}
						</option>
					))}
				</select>
			</label>
			<div className="field-row">
				<label>
					{t.reportRangeFrom}
					<input type="date" value={from} onChange={(event) => onFromChange(event.target.value)} />
				</label>
				<label>
					{t.reportRangeTo}
					<input type="date" value={to} onChange={(event) => onToChange(event.target.value)} />
				</label>
			</div>
			<p className="report-description">{t.reportDescriptions[selectedReport]}</p>
		</Filters>
	);
}
