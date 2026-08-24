<script setup lang="ts">
import { computed } from 'vue';

type AlertSeverity = 'info' | 'success' | 'warning' | 'error';

const props = withDefaults(
	defineProps<{
		severity?: AlertSeverity;
		heading: string;
		body: string;
		/** Overrides the default glyph shown for the severity, e.g. a custom character or emoji. */
		icon?: string;
	}>(),
	{ severity: 'info' },
);

const defaultIcons: Record<AlertSeverity, string> = {
	info: 'ℹ',
	success: '✓',
	warning: '!',
	error: '✕',
};

const displayIcon = computed(() => props.icon ?? defaultIcons[props.severity]);
</script>

<template>
	<div class="alert" :class="severity">
		<span class="alert-icon" aria-hidden="true">{{ displayIcon }}</span>
		<div class="alert-text">
			<p class="alert-heading">{{ heading }}</p>
			<p class="alert-body">{{ body }}</p>
		</div>
	</div>
</template>

<style scoped>
.alert {
	display: flex;
	gap: 14px;
	padding: 16px 18px;
	border-radius: var(--radius-md);
	background: var(--color-surface-soft);
}
.alert-icon {
	display: grid;
	flex: 0 0 auto;
	width: 32px;
	height: 32px;
	place-items: center;
	border-radius: 50%;
	color: var(--color-on-brand);
	font-size: 16px;
	font-weight: 700;
}
.alert.info .alert-icon {
	background: var(--color-brand);
}
.alert.success .alert-icon {
	background: var(--color-success);
}
.alert.warning .alert-icon {
	background: var(--color-warning);
}
.alert.error .alert-icon {
	background: var(--color-error);
}
.alert-text {
	display: grid;
	gap: 4px;
}
.alert-heading {
	font-size: 15px;
	font-weight: 700;
}
.alert.info .alert-heading {
	color: var(--color-brand);
}
.alert.success .alert-heading {
	color: var(--color-success);
}
.alert.warning .alert-heading {
	color: var(--color-warning);
}
.alert.error .alert-heading {
	color: var(--color-error);
}
.alert-body {
	color: var(--color-text-muted);
	font-size: 14px;
	line-height: 1.5;
}
</style>
