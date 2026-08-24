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
	<LegalDocumentView
		v-if="isPrivacy"
		:back-label="t.backToGuest"
		:markdown="privacyMarkdown"
		@back="$emit('back')"
	/>
	<LegalDocumentView
		v-else-if="isTerms"
		:back-label="t.backToGuest"
		:markdown="termsMarkdown"
		@back="$emit('back')"
	/>
	<footer v-else-if="!isQrCode" class="app-footer">
		<a href="/privacy" @click.prevent="showPrivacy">{{ t.privacyPolicy }}</a>
		<span class="app-footer-divider" aria-hidden="true">·</span>
		<a href="/terms" @click.prevent="showTerms">{{ t.termsAndConditions }}</a>
	</footer>
</template>
