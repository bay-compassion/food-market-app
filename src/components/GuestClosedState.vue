<script setup lang="ts">
import type { Translation } from '../locales';

defineProps<{
	t: Translation;
	/** Whether to offer a way to sign up early from the closed state. */
	showPreregisterCta: boolean;
}>();

const emit = defineEmits<{ preregister: [] }>();
</script>

<template>
	<div class="closed-state">
		<div class="closed-icon" aria-hidden="true">—</div>
		<h2>{{ t.registrationClosed }}</h2>
		<p>{{ t.registrationClosedDescription }}</p>
		<a
			v-if="showPreregisterCta"
			class="preregister-cta"
			href="/signup"
			@click.prevent="emit('preregister')"
		>
			{{ t.preregisterCta }}
		</a>
	</div>
</template>

<style scoped>
.closed-state {
	display: grid;
	min-height: 280px;
	place-content: center;
	text-align: center;
}
.closed-state h2 {
	margin-bottom: 8px;
	font-family: var(--font-heading);
	font-size: 28px;
	text-transform: uppercase;
}
.closed-state p {
	max-width: 320px;
	color: var(--color-text-muted);
	line-height: 1.55;
}
.closed-icon {
	display: grid;
	width: 54px;
	height: 54px;
	place-self: center;
	place-items: center;
	margin-bottom: 16px;
	border-radius: 50%;
	color: white;
	background: var(--color-brand);
	font-size: 28px;
}
.preregister-cta {
	margin: 12px auto 0;
	color: var(--color-brand);
	font-weight: 700;
	text-decoration: underline;
}
</style>
