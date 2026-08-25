<template>
	<section class="card">
		<slot />
	</section>
</template>

<style scoped>
.card {
	padding: 32px 22px;
	border: 2px solid var(--color-brand);
	border-radius: var(--radius-lg);
	background: var(--color-background);
}
</style>
