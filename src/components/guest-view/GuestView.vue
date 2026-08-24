<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import type { Locale, Translation } from '../../locales';
import LegalDocumentView from '../legal/LegalDocumentView.vue';
import privacyMarkdown from '../legal/privacy.md?raw';
import termsMarkdown from '../legal/terms.md?raw';
import QrCodeView from '../QrCodeView.vue';
import GuestQueueScreen from './GuestQueueScreen.vue';

defineProps<{
	t: Translation;
	locale: Locale;
	isReturningVisitor: boolean;
}>();
defineEmits<{ 'select-language': [locale: Locale] }>();

const route = useRoute();
const router = useRouter();
const isPrivacy = computed(() => route.name === 'privacy');
const isTerms = computed(() => route.name === 'terms');
const isQrCode = computed(() => route.name === 'qr-code');
/**
 * Whether one of the guest chrome views (legal docs, QR code) covers the queue screen. Kept as a
 * `v-show` below rather than folding `GuestQueueScreen` into this `v-if`/`v-else-if` chain — it
 * unmounting on every trip to `/privacy` would drop in-progress form input and restart its polling.
 */
const showsChrome = computed(() => isPrivacy.value || isTerms.value || isQrCode.value);

const queueScreen = ref<InstanceType<typeof GuestQueueScreen> | null>(null);

function showGuest() {
	queueScreen.value?.resetToForm();
	void router.push({ name: 'guest' });
}

defineExpose({ resetToForm: () => queueScreen.value?.resetToForm() });
</script>

<template>
	<LegalDocumentView
		v-if="isPrivacy"
		:back-label="t.backToGuest"
		:markdown="privacyMarkdown"
		@back="showGuest"
	/>
	<LegalDocumentView
		v-else-if="isTerms"
		:back-label="t.backToGuest"
		:markdown="termsMarkdown"
		@back="showGuest"
	/>
	<QrCodeView
		v-else-if="isQrCode"
		:back-label="t.backToGuest"
		:title="t.qrCodeTitle"
		:description="t.qrCodeDescription"
		:image-alt="t.qrCodeImageAlt"
		:print-label="t.qrCodePrint"
		@back="showGuest"
	/>
	<GuestQueueScreen
		v-show="!showsChrome"
		ref="queueScreen"
		:t="t"
		:locale="locale"
		:is-returning-visitor="isReturningVisitor"
		@select-language="$emit('select-language', $event)"
	/>
</template>
