<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import { adminTranslations } from '../../adminLocales';
import type { Locale } from '../../locales';
import { csvFilename, toCsv } from '../../services/reportCsv';
import { reportCsvRows } from '../../services/reportFormat';
import {
	defaultReportRange,
	reportColumns,
	reportRangeBounds,
	type ReportId,
	type ReportRow,
} from '../../services/reports';
import AppButton from '../AppButton.vue';
import ReportFilters from './ReportFilters.vue';
import ReportTable from './ReportTable.vue';

/**
 * The reporting screen. It owns its own fetching rather than pushing that up to
 * `AdminDashboard`, because nothing else on the admin side reads or writes report data — keeping
 * it here is what stops the dashboard container from growing another five pieces of state.
 */

const props = defineProps<{
	locale: Locale;
	getAccessToken: () => Promise<string>;
	/** Whether this worker may download the export that names guests. */
	canExport: boolean;
}>();

const t = computed(() => adminTranslations.en);
const range = defaultReportRange();
const selectedReport = ref<ReportId>('session-summary');
const from = ref(range.from);
const to = ref(range.to);
const rows = ref<ReportRow[]>([]);
const isBusy = ref(false);
const feedback = ref('');

const columns = computed(() => reportColumns[selectedReport.value]);
const isRangeValid = computed(() => reportRangeBounds(from.value, to.value) !== null);

/**
 * Which request the screen is currently waiting on. Changing the range fires a new query without
 * cancelling the last one, and the two can come back in either order — this makes sure a slower
 * earlier answer cannot overwrite the range the worker is actually looking at.
 */
let latestRequest = 0;

async function authHeaders() {
	return { Authorization: `Bearer ${await props.getAccessToken()}` };
}

function rangeParams() {
	return new URLSearchParams({ from: from.value, to: to.value });
}

function download(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');

	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}

async function loadReport() {
	if (!isRangeValid.value) {
		// Abandon whatever is in flight: its answer describes a range the worker has already left.
		latestRequest += 1;
		rows.value = [];
		isBusy.value = false;
		feedback.value = t.value.reportRangeInvalid;

		return;
	}
	const requestId = (latestRequest += 1);

	isBusy.value = true;
	feedback.value = '';

	try {
		const params = rangeParams();

		params.set('report', selectedReport.value);
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

		if (requestId !== latestRequest) {
			return;
		}
		rows.value = payload.rows;
	} catch {
		if (requestId !== latestRequest) {
			return;
		}
		rows.value = [];
		feedback.value = t.value.error;
	} finally {
		if (requestId === latestRequest) {
			isBusy.value = false;
		}
	}
}

/** Built from what is already on screen, so the file matches the table the worker is looking at. */
function downloadReportCsv() {
	const headers = columns.value.map((column) => t.value.reportColumnLabels[column.key]);
	const csv = toCsv(headers, reportCsvRows(columns.value, rows.value, t.value.reportValueLabels));

	download(
		new Blob([csv], { type: 'text/csv;charset=utf-8' }),
		csvFilename(selectedReport.value, from.value, to.value),
	);
}

/** The full visit-level export, which the server builds because it is far more than the screen holds. */
async function downloadVisitExport() {
	if (!isRangeValid.value) {
		feedback.value = t.value.reportRangeInvalid;

		return;
	}
	isBusy.value = true;
	feedback.value = '';

	try {
		const params = rangeParams();

		params.set('view', 'export');
		const response = await fetch(`/api/reports?${params}`, { headers: await authHeaders() });

		if (!response.ok) {
			throw new Error('export');
		}
		download(await response.blob(), csvFilename('visits', from.value, to.value));
	} catch {
		feedback.value = t.value.error;
	} finally {
		isBusy.value = false;
	}
}

watch([selectedReport, from, to], loadReport);
onMounted(loadReport);
</script>

<template>
	<section class="admin-section settings-card">
		<!-- Deliberately not disabled while a report loads: correcting a range you have just
		     mistyped is the moment you least want the inputs taken away from you. -->
		<ReportFilters
			v-model:selected-report="selectedReport"
			v-model:from="from"
			v-model:to="to"
			:locale="locale"
		/>

		<p v-if="feedback" class="admin-feedback" role="status">{{ feedback }}</p>

		<ReportTable v-if="rows.length" :locale="locale" :columns="columns" :rows="rows" />
		<p v-else-if="!isBusy && !feedback" class="empty-state">{{ t.reportEmpty }}</p>

		<div class="report-actions">
			<AppButton type="button" :disabled="isBusy || !rows.length" @click="downloadReportCsv">
				{{ t.reportDownloadCsv }}
			</AppButton>
		</div>
	</section>

	<!-- Hidden outright rather than shown disabled: a worker without the permission has no way to
	     get it themselves, so offering the button would only be a dead end. -->
	<section v-if="canExport" class="admin-section action-card">
		<h2>{{ t.reportExportVisits }}</h2>
		<p>{{ t.reportExportVisitsHelp }}</p>
		<p class="privacy-note">{{ t.reportPrivacyNote }}</p>
		<div class="report-actions">
			<AppButton type="button" :disabled="isBusy" @click="downloadVisitExport">
				{{ t.reportDownloadCsv }}
			</AppButton>
		</div>
	</section>
</template>

<style scoped>
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
</style>
