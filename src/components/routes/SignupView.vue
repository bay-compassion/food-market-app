<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import GuestStateMessage from '@/components/guest-view/GuestStateMessage.vue';
import Card from '@/components/ui/layout/Card.vue';
import { GuestRegistrationForm } from '@/react-bridge/islands.ts';
import { fromMobx } from '@/stores/hooks/from-mobx.ts';
import type { RegistrationSubmitResult } from '@/stores/registration.store.ts';
import { useStore } from '@/stores/use-store.ts';

const { guest, translations } = useStore();
const t = fromMobx(() => translations.translation);
const router = useRouter();

// Signing up (identity only) only makes sense before a device has one — an already-identified
// guest has nothing left to ask here, so send them to the page that reflects their real state
// (queue form, visit status, or the session's current phase) instead of duplicating that logic.
onMounted(() => {
	if (guest.isIdentified) {
		void router.replace({ name: 'guest' });
	}
});

const isSignedUp = ref(false);

function handleSubmitted(result: RegistrationSubmitResult) {
	if (result.kind === 'signed-up') {
		isSignedUp.value = true;
	}
}
</script>

<template>
	<Card aria-live="polite">
		<GuestStateMessage
			v-if="isSignedUp"
			:heading="t.earlySuccessTitle"
			:description="t.earlySuccessDescription"
		/>
		<GuestRegistrationForm v-else context="early" :now="Date.now()" @submitted="handleSubmitted" />
	</Card>
</template>

<style scoped></style>
