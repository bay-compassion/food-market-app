import styled from '@emotion/styled';
import { observer } from 'mobx-react-lite';

import { adminTranslations } from '../../adminLocales';
import { formatReportCell } from '../../services/reportFormat';
import type { ReportColumn, ReportRow } from '../../services/reports';
import { useRootStore } from '../../stores/react/store-context';

export type ReportCardsProps = {
	columns: ReportColumn[];
	rows: ReportRow[];
	/** Names the list for assistive technology: the report being read. */
	label: string;
};

const List = styled.ul`
	display: grid;
	gap: 10px;
	margin: 0;
	padding: 0;
	list-style: none;

	li {
		padding: 14px 16px;
		border: 1.5px solid #c7d2cc;
		border-radius: var(--radius-md);
	}

	/* Outranks the section headings' uppercase display style in admin.css. */
	&& li h2 {
		margin: 0 0 10px;
		font-family: var(--font-body);
		font-size: 16px;
		text-transform: none;
	}

	dl {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px 14px;
		margin: 0;
	}

	dl div {
		display: grid;
		gap: 2px;
	}

	dt {
		color: var(--color-text-subtle);
		font-size: 13px;
	}

	dd {
		margin: 0;
		font-size: 17px;
		font-variant-numeric: tabular-nums;
		font-weight: 700;
	}
`;

/**
 * A report on a phone: one card per row, its first column as the card's title and every other
 * column as a labelled figure under it. A report's table is wider than a phone, and a table that
 * scrolls sideways hides the very figures it is there to show.
 */
export const ReportCards = observer(function ReportCards({
	columns,
	rows,
	label,
}: ReportCardsProps) {
	const t = adminTranslations.en;
	const { translations } = useRootStore();
	const [title, ...figures] = columns;

	function cell(row: ReportRow, column: ReportColumn) {
		return formatReportCell(row[column.key], column.type, translations.locale, t.reportValueLabels);
	}

	return (
		<List className="report-cards" aria-label={label}>
			{rows.map((row, index) => (
				<li key={index}>
					{title ? <h2>{cell(row, title)}</h2> : null}
					<dl>
						{figures.map((column) => (
							<div key={column.key}>
								<dt>{t.reportColumnLabels[column.key]}</dt>
								<dd>{cell(row, column)}</dd>
							</div>
						))}
					</dl>
				</li>
			))}
		</List>
	);
});
