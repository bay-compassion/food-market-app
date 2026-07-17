<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'primary' | 'secondary' }>(), { variant: 'primary' });
</script>

<template>
	<button class="app-button" :class="variant">
		<slot />
	</button>
</template>

<style scoped>
.app-button {
	display: flex;
	justify-content: center;
	align-items: center;
	gap: 13px;
	border: 0;
	border-radius: var(--radius-pill);
	font-family: var(--font-heading);
	font-weight: 700;
	letter-spacing: 0.02em;
	text-transform: uppercase;
	transition:
		transform 0.2s,
		background 0.2s;
}
.app-button:disabled {
	cursor: wait;
	opacity: 0.65;
	transform: none;
}
.app-button.primary {
	min-height: 60px;
	gap: 12px;
	color: var(--color-on-brand);
	background: var(--color-brand);
	font-size: 16.5px;
}
.app-button.primary:hover:not(:disabled) {
	background: var(--color-brand-dark);
	transform: translateY(-1px);
}
.app-button.secondary {
	min-width: 170px;
	min-height: 54px;
	padding: 0 24px;
	color: var(--color-brand);
	background: var(--color-background);
	font-size: 15px;
	box-shadow: inset 0 0 0 1.5px var(--color-brand);
}
.app-button.secondary:hover {
	color: var(--color-on-brand);
	background: var(--color-brand);
	transform: translateY(-1px);
}
</style>
