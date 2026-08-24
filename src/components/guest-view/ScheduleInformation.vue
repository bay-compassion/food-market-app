<script setup lang="ts">
import Alert from '@/components/ui/alerts/Alert.vue';

import type { Translation } from '../../locales';

defineProps<{
	t: Translation;
}>();
</script>

<template>
	<Alert
		:heading="t.guestView.scheduleInformation.heading"
		:body="t.guestView.scheduleInformation.body"
	/>
</template>

<style scoped></style>
