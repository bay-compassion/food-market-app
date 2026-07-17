<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'on-brand' | 'brand' }>(), { tone: 'on-brand' });
</script>

<template>
	<p class="eyebrow" :class="tone"><span></span><slot /></p>
</template>

<style scoped>
.eyebrow {
	display: flex;
	align-items: center;
	gap: 9px;
	margin: 0 0 16px;
	font-family: var(--font-heading);
	font-size: 13.5px;
	font-weight: 600;
	letter-spacing: 0.1em;
	text-transform: uppercase;
}
.eyebrow span {
	display: block;
	width: 22px;
	height: 2px;
	border-radius: 1px;
	background: currentColor;
}
.eyebrow.on-brand {
	color: var(--color-on-brand);
}
.eyebrow.brand {
	color: var(--color-brand);
}
</style>
