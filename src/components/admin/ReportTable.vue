<script setup lang="ts">
import { computed } from 'vue';

import { adminTranslations } from '../../adminLocales';
import type { Locale } from '../../locales';
import { formatReportCell } from '../../services/reportFormat';
import type { ReportColumn, ReportRow } from '../../services/reports';

const props = defineProps<{ locale: Locale; columns: ReportColumn[]; rows: ReportRow[] }>();

const t = computed(() => adminTranslations.en);

/** Numbers read far more easily down a column when they end in the same place. */
function isNumeric(column: ReportColumn) {
	return column.type !== 'text' && column.type !== 'label' && column.type !== 'datetime';
}

function cell(row: ReportRow, column: ReportColumn) {
	return formatReportCell(row[column.key], column.type, props.locale, t.value.reportValueLabels);
}
</script>

<template>
	<div class="report-scroll">
		<table class="report-table">
			<thead>
				<tr>
					<th
						v-for="column in columns"
						:key="column.key"
						scope="col"
						:class="{ numeric: isNumeric(column) }"
					>
						{{ t.reportColumnLabels[column.key] }}
					</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="(row, index) in rows" :key="index">
					<td v-for="column in columns" :key="column.key" :class="{ numeric: isNumeric(column) }">
						{{ cell(row, column) }}
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<style scoped>
/* The table scrolls inside its own box so a wide report never scrolls the whole page sideways. */
.report-scroll {
	overflow-x: auto;
	border: 1.5px solid #c7d2cc;
	border-radius: var(--radius-md);
}
.report-table {
	width: 100%;
	border-collapse: collapse;
	font-variant-numeric: tabular-nums;
}
.report-table th,
.report-table td {
	padding: 11px 14px;
	text-align: start;
	white-space: nowrap;
}
.report-table th {
	position: sticky;
	top: 0;
	background: #f3f6f4;
	color: var(--color-brand);
	font-family: var(--font-heading);
	font-size: 13px;
	text-transform: uppercase;
	letter-spacing: 0.03em;
}
.report-table td {
	border-top: 1px solid #dce3df;
}
.report-table .numeric {
	text-align: end;
}
.report-table tbody tr:nth-child(even) {
	background: #fafcfb;
}
</style>
