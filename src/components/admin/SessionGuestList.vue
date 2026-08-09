<script setup lang="ts">
import { computed } from 'vue';

import { adminTranslations } from '../../adminLocales';
import { languages, translations, type Locale } from '../../locales';
import type { QueueGuest } from './types';

const props = defineProps<{ locale: Locale; guests: QueueGuest[] }>();

const t = computed(() => adminTranslations[props.locale]);
const base = computed(() => translations[props.locale]);

function guestLanguageLabel(locale: Locale) {
	return languages.find((language) => language.code === locale)?.label ?? locale;
}
</script>

<template>
	<section class="admin-section guest-section registered-section">
		<div class="section-heading">
			<h2>{{ t.registeredGuests }}</h2>
			<span class="session-count">{{ guests.length }}</span>
		</div>
		<div v-if="guests.length" class="guest-list">
			<article v-for="guest in guests" :key="guest.id" class="guest-row">
				<div>
					<strong>{{ guest.firstName }} {{ guest.lastName }}</strong>
					<span>{{ guest.phone }} · {{ base.household }}: {{ guest.householdSize }}</span>
					<span>{{ base.language }}: {{ guestLanguageLabel(guest.locale) }}</span>
				</div>
			</article>
		</div>
		<p v-else class="empty-state">{{ t.noRegisteredGuests }}</p>
	</section>
</template>

<style scoped>
.session-count {
	display: grid;
	place-items: center;
	min-width: 38px;
	height: 38px;
	padding: 0 10px;
	border-radius: var(--radius-pill);
	color: var(--color-on-brand);
	background: var(--color-brand);
	font-family: var(--font-heading);
	font-weight: 700;
}
</style>
