<script setup lang="ts">
import { computed } from 'vue';

import { adminTranslations } from '../../adminLocales';
import type { Locale } from '../../locales';
import { reportIds, type ReportId } from '../../services/reports';

const props = defineProps<{ locale: Locale }>();
const selectedReport = defineModel<ReportId>('selectedReport', { required: true });
const from = defineModel<string>('from', { required: true });
const to = defineModel<string>('to', { required: true });

const t = computed(() => adminTranslations.en);
</script>

<template>
	<div class="report-filters">
		<label class="report-picker">
			{{ t.reports }}
			<select v-model="selectedReport">
				<option v-for="id in reportIds" :key="id" :value="id">{{ t.reportNames[id] }}</option>
			</select>
		</label>
		<div class="field-row">
			<label>
				{{ t.reportRangeFrom }}
				<input v-model="from" type="date" />
			</label>
			<label>
				{{ t.reportRangeTo }}
				<input v-model="to" type="date" />
			</label>
		</div>
		<p class="report-description">{{ t.reportDescriptions[selectedReport] }}</p>
	</div>
</template>

<style scoped>
.report-filters {
	display: grid;
	gap: 15px;
}
.report-description {
	color: var(--color-text-subtle);
	line-height: 1.5;
}
@media (min-width: 860px) {
	.report-filters {
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		align-items: end;
	}
	.report-description {
		grid-column: 1 / -1;
	}
}
</style>
