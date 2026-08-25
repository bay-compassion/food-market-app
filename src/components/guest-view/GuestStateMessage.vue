<script setup lang="ts">
withDefaults(defineProps<{ heading: string; description: string; icon?: string }>(), {
	icon: '—',
});
</script>

<template>
	<div class="state-message">
		<div class="state-icon" aria-hidden="true">{{ icon }}</div>
		<h2>{{ heading }}</h2>
		<p>{{ description }}</p>
		<slot />
	</div>
</template>

<style scoped>
.state-message {
	display: grid;
	min-height: 280px;
	place-content: center;
	text-align: center;
}
.state-message h2 {
	margin-bottom: 8px;
	font-family: var(--font-heading);
	font-size: 28px;
	text-transform: uppercase;
}
.state-message p {
	max-width: 320px;
	color: var(--color-text-muted);
	line-height: 1.55;
}
.state-icon {
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
</style>
