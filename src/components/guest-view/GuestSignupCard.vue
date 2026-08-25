<script setup lang="ts">
import Card from '../ui/layout/Card.vue';
</script>

<template>
	<Card class="checkin-card" aria-live="polite">
		<slot />
	</Card>
</template>
