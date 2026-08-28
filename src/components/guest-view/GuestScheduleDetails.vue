<script setup lang="ts">
import type { Translation } from '../../locales';

defineProps<{ t: Translation }>();
</script>

<template>
	<div class="schedule-details">
		<p class="schedule-heading">{{ t.guestView.scheduleInformation.heading }}</p>
		<p class="schedule-body">{{ t.guestView.scheduleInformation.body }}</p>
	</div>
</template>

<style scoped>
.schedule-details {
	display: grid;
	max-width: 360px;
	gap: 8px;
	margin: 0 auto 8px;
}
.schedule-heading {
	color: var(--color-brand);
	font-weight: 700;
	line-height: 1.4;
}
.schedule-body {
	color: var(--color-text-muted);
	line-height: 1.55;
}
</style>
