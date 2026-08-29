<script setup lang="ts">
import { useRouter } from 'vue-router';

import { reactIsland } from '@/react-bridge/react-island.ts';
import { fromMobx } from '@/stores/hooks/from-mobx.ts';
import { useStore } from '@/stores/use-store.ts';

import { LegalDocumentView } from './LegalDocumentView.tsx';
import privacyMarkdown from './privacy.md?raw';

/**
 * A thin Vue shell around a React screen. It supplies the two things the route knows and the
 * island cannot reach on its own — the translated label and vue-router navigation — and goes away
 * once routing itself is React.
 */

const LegalDocument = reactIsland(LegalDocumentView);
const { translations } = useStore();
const router = useRouter();
const t = fromMobx(() => translations.translation);

function showGuest() {
	void router.push({ name: 'guest' });
}
</script>

<template>
	<LegalDocument :backLabel="t.backToGuest" :markdown="privacyMarkdown" :onBack="showGuest" />
</template>
