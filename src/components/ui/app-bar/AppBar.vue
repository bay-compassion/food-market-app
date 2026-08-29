<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';

import { languages } from '@/locales.ts';
import { fromMobx } from '@/stores/hooks/from-mobx.ts';
import type { Language } from '@/stores/translation.store.ts';
import { useStore } from '@/stores/use-store.ts';

interface Props {}

const props = defineProps<Props>();
const { guest, translations } = useStore();
const t = fromMobx(() => translations.translation);
const locale = fromMobx(() => translations.locale);
const isReturningVisitor = fromMobx(() => guest.isReturningVisitor);

const router = useRouter();
const route = useRoute();
const isAdmin = fromMobx(() => route.name === 'admin');

function setLocale(payload: Event) {
	const target = payload.target as HTMLSelectElement;

	translations.setLanguage(target.value as Language);
}

function toggleMode() {
	void router.push({ name: isAdmin.value ? 'guest' : 'admin' });
}
</script>

<template>
	<header class="topbar">
		<RouterLink class="brand" to="/">
			<img class="brand-mark" src="/bay-compassion-logo.png" alt="" />
			<span>{{ t.marketName }}</span>
		</RouterLink>
		<div class="header-actions">
			<label v-if="isReturningVisitor" class="language-picker">
				<span class="sr-only">{{ t.language }}</span>
				<select v-model="locale" :aria-label="t.language" @change="setLocale">
					<option
						v-for="language in languages"
						:key="language.code"
						:value="language.code as Language"
					>
						{{ language.label }}
					</option>
				</select>
			</label>
			<button class="mode-button" type="button" @click="toggleMode">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0" />
				</svg>
				{{ isAdmin ? t.guest : t.admin }}
			</button>
		</div>
	</header>
</template>

<style scoped></style>
