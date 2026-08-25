<script setup lang="ts">
import type { Translation } from '../../locales';
import GuestStateMessage from './GuestStateMessage.vue';

defineProps<{ t: Translation }>();
</script>

<template>
	<GuestStateMessage
		:heading="t.guestView.registrationClosedState.heading"
		:description="t.guestView.registrationClosedState.description"
	/>
</template>
