<script setup lang="ts">
import { toRef } from 'vue';

import { useStore } from '@/stores/use-store.ts';

import LegalDocumentView from './LegalDocumentView.vue';
import termsMarkdown from './terms.md?raw';

const { translations } = useStore();
const t = toRef(translations, 'translation');
</script>

<template>
	<LegalDocumentView :back-label="t.backToGuest" :markdown="termsMarkdown" />
</template>

<style scoped></style>
