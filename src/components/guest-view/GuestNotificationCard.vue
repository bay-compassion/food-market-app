<script setup lang="ts">
import type { Locale } from '../../locales';
import Card from '../ui/layout/Card.vue';
import NotificationOptIn from './NotificationOptIn.vue';

defineProps<{
	locale: Locale;
	/** Consent is a guest characteristic, not a per-visit one, so this card is shown whenever the
	 *  guest is identified (a visit token exists), regardless of which state `GuestSignupCard` is
	 *  showing above it — not only once there's an active visit to report status on. */
	visitToken: string | null;
}>();
</script>

<template>
	<Card v-if="visitToken" class="checkin-card" aria-live="polite">
		<NotificationOptIn :visit-token="visitToken" :locale="locale" />
	</Card>
</template>
