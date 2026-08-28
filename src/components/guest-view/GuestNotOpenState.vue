<script setup lang="ts">
import { useRouter } from 'vue-router';

import AppButton from '@/components/AppButton.vue';

import type { Translation } from '../../locales';
import GuestStateMessage from './GuestStateMessage.vue';

const router = useRouter();

withDefaults(defineProps<{ t: Translation; allowPreregister?: boolean }>(), {
	allowPreregister: true,
});

function goToSignup() {
	void router.push({ name: 'signup' });
}
</script>

<template>
	<GuestStateMessage
		class="inactive-message"
		:heading="t.guestView.notOpenState.heading"
		:description="t.guestView.notOpenState.subheading"
	>
		<AppButton v-if="allowPreregister" @click="goToSignup"> Preregister </AppButton>
		<div class="inactive-details">
			<p>{{ t.guestView.notOpenState.lotteryDescription }}</p>
			<p>{{ t.guestView.notOpenState.selectionDescription }}</p>
		</div>
	</GuestStateMessage>
</template>

<style scoped>
.inactive-message {
	--state-description-max-width: 420px;
}
.inactive-details {
	display: grid;
	max-width: 420px;
	gap: 16px;
	margin-top: 20px;
	color: var(--color-text-muted);
	line-height: 1.55;
	text-align: justify;
	text-align-last: start;
	hyphens: auto;
}
</style>
