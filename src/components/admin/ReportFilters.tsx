import styled from '@emotion/styled';

import { adminTranslations } from '../../adminLocales';
import { reportIds, type ReportId } from '../../services/reports';
import { ChoiceChips } from './ChoiceChips';

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

	/*
	 * Two dates side by side even on a phone: each is short, and together they read as a range.
	 * Doubled to outrank the shared \`.field-row\`, which stacks its fields on a phone.
	 */
	&& .field-row {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}

	&& .field-row input {
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
	}
`;

/** Which report to run, as a row of pills that are all in sight, and over what dates. */
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
			<ChoiceChips
				label={t.reports}
				options={reportIds.map((id) => ({ value: id, label: t.reportNames[id] }))}
				value={selectedReport}
				onChange={onSelectedReportChange}
			/>
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
