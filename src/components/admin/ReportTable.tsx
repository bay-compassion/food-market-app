import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { formatReportCell } from '../../services/reportFormat';
import type { ReportColumn, ReportRow } from '../../services/reports';
import { useRootStore } from '../../stores/react/store-context';

export type ReportTableProps = {
	columns: ReportColumn[];
	rows: ReportRow[];
};

/* The table scrolls inside its own box so a wide report never scrolls the whole page sideways. */
const Scroll = styled.div`
	overflow-x: auto;
	border: 1.5px solid #c7d2cc;
	border-radius: var(--radius-md);
`;

const Table = styled.table`
	width: 100%;
	border-collapse: collapse;
	font-variant-numeric: tabular-nums;

	th,
	td {
		padding: 11px 14px;
		text-align: start;
		white-space: nowrap;
	}

	th {
		position: sticky;
		top: 0;
		background: #f3f6f4;
		color: var(--color-brand);
		font-family: var(--font-heading);
		font-size: 13px;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	td {
		border-top: 1px solid #dce3df;
	}

	.numeric {
		text-align: end;
	}

	tbody tr:nth-of-type(even) {
		background: #fafcfb;
	}
`;

/** Numbers read far more easily down a column when they end in the same place. */
function isNumeric(column: ReportColumn) {
	return column.type !== 'text' && column.type !== 'label' && column.type !== 'datetime';
}

/** A report's rows, formatted for reading rather than for the wire. */
export const ReportTable = observer(function ReportTable({ columns, rows }: ReportTableProps) {
	const t = adminTranslations.en;
	const { translations } = useRootStore();

	function cell(row: ReportRow, column: ReportColumn) {
		return formatReportCell(row[column.key], column.type, translations.locale, t.reportValueLabels);
	}

	return (
		<Scroll className="report-scroll">
			<Table className="report-table">
				<thead>
					<tr>
						{columns.map((column) => (
							<th
								key={column.key}
								scope="col"
								className={isNumeric(column) ? 'numeric' : undefined}
							>
								{t.reportColumnLabels[column.key]}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row, index) => (
						<tr key={index}>
							{columns.map((column) => (
								<td key={column.key} className={isNumeric(column) ? 'numeric' : undefined}>
									{cell(row, column)}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</Table>
		</Scroll>
	);
});
