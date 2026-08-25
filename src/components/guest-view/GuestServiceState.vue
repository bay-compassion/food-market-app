<script setup lang="ts">
import { computed } from 'vue';

import type { Translation } from '../../locales';
import GuestStateMessage from './GuestStateMessage.vue';

const props = defineProps<{
	t: Translation;
	/** `false` while service is underway (`service_started`); `true` once the session has `ended`. */
	hasEnded: boolean;
}>();

const copy = computed(() =>
	props.hasEnded
		? {
				heading: props.t.guestView.serviceState.endedHeading,
				description: props.t.guestView.serviceState.endedDescription,
			}
		: {
				heading: props.t.guestView.serviceState.inProgressHeading,
				description: props.t.guestView.serviceState.inProgressDescription,
			},
);
</script>

<template>
	<GuestStateMessage :heading="copy.heading" :description="copy.description" />
</template>
