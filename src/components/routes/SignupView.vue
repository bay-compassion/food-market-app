<script setup lang="ts">
import { onMounted, ref, toRef } from 'vue';
import { useRouter } from 'vue-router';

import GuestRegistrationForm from '@/components/guest-view/GuestRegistrationForm.vue';
import GuestSignupCard from '@/components/guest-view/GuestSignupCard.vue';
import GuestStateMessage from '@/components/guest-view/GuestStateMessage.vue';
import type { RegistrationSubmitResult } from '@/services/registration.store.ts';
import { useStore } from '@/stores/use-store.ts';

const { guest, translations } = useStore();
const t = toRef(translations, 'translation');
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
	<GuestSignupCard>
		<GuestStateMessage
			v-if="isSignedUp"
			:heading="t.earlySuccessTitle"
			:description="t.earlySuccessDescription"
		/>
		<GuestRegistrationForm v-else context="early" :now="Date.now()" @submitted="handleSubmitted" />
	</GuestSignupCard>
</template>

<style scoped></style>
