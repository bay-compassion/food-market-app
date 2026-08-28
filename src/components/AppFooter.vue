<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import type { Translation } from '../locales';
import LegalDocumentView from './legal/LegalDocumentView.vue';
import privacyMarkdown from './legal/privacy.md?raw';
import termsMarkdown from './legal/terms.md?raw';

defineProps<{ t: Translation }>();
defineEmits<{ back: [] }>();

const route = useRoute();
const router = useRouter();
const isPrivacy = computed(() => route.name === 'privacy');
const isTerms = computed(() => route.name === 'terms');
const isQrCode = computed(() => route.name === 'qr-code');

function showPrivacy() {
	void router.push({ name: 'privacy' });
}

function showTerms() {
	void router.push({ name: 'terms' });
}
</script>

<template>
	<!--	<LegalDocumentView-->
	<!--		v-if="isPrivacy"-->
	<!--		:back-label="t.backToGuest"-->
	<!--		:markdown="privacyMarkdown"-->
	<!--		@back="$emit('back')"-->
	<!--	/>-->
	<!--	<LegalDocumentView-->
	<!--		v-else-if="isTerms"-->
	<!--		:back-label="t.backToGuest"-->
	<!--		:markdown="termsMarkdown"-->
	<!--		@back="$emit('back')"-->
	<!--	/>-->
	<footer class="app-footer">
		<RouterLink to="/privacy">{{ t.privacyPolicy }}</RouterLink>
		<span class="app-footer-divider" aria-hidden="true">·</span>
		<RouterLink to="/terms">{{ t.termsAndConditions }}</RouterLink>
	</footer>
</template>
