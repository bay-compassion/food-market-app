<script setup lang="ts">
import type { Translation } from '../../locales';
import GuestStateMessage from './GuestStateMessage.vue';

defineProps<{
	t: Translation;
	/** Whether to offer a way to sign up early from this screen. */
	showPreregisterCta: boolean;
}>();

const emit = defineEmits<{ preregister: [] }>();
</script>

<template>
	<GuestStateMessage
		:heading="t.guestView.notOpenState.heading"
		:description="t.guestView.notOpenState.description"
	>
		<a
			v-if="showPreregisterCta"
			class="preregister-cta"
			href="/signup"
			@click.prevent="emit('preregister')"
		>
			{{ t.guestView.notOpenState.preregisterCta }}
		</a>
	</GuestStateMessage>
</template>

<style scoped>
.preregister-cta {
	margin: 12px auto 0;
	color: var(--color-brand);
	font-weight: 700;
	text-decoration: underline;
}
</style>
