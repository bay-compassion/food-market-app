<script setup lang="ts">
import { computed } from 'vue';

import { adminTranslations } from '../../adminLocales';
import { languages, translations, type Locale } from '../../locales';
import type { GuestAdmission } from '../../services/guestAdmission';
import type { VisitCommand, VisitStatus } from '../../services/visitStateMachine';
import AddGuestSection from './AddGuestSection.vue';
import type { ManualGuest, QueueGuest } from './types';
import VisitCommandButtons from './VisitCommandButtons.vue';

const props = defineProps<{
	locale: Locale;
	guests: QueueGuest[];
	statusLabels: Record<VisitStatus, string>;
	admissions: GuestAdmission[];
	busy?: boolean;
}>();
const emit = defineEmits<{
	search: [];
	run: [guest: QueueGuest, command: VisitCommand];
	addGuest: [guest: ManualGuest];
}>();
const searchQuery = defineModel<string>('searchQuery', { required: true });

const t = computed(() => adminTranslations.en);
const base = computed(() => translations[props.locale]);

function guestLanguageLabel(locale: Locale) {
	return languages.find((language) => language.code === locale)?.label ?? locale;
}
</script>

<template>
	<section class="admin-section guest-section">
		<div class="section-heading">
			<h2>{{ t.allGuests }}</h2>
		</div>
		<form class="search-form" @submit.prevent="emit('search')">
			<input
				v-model="searchQuery"
				type="search"
				:placeholder="t.searchPlaceholder"
				:aria-label="t.searchPlaceholder"
			/><button type="submit">{{ t.search }}</button>
		</form>
		<div v-if="guests.length" class="guest-list">
			<article v-for="guest in guests" :key="guest.id" class="guest-row">
				<div>
					<strong>{{ guest.firstName }} {{ guest.lastName }}</strong
					><span>{{ guest.phone }} · {{ base.household }}: {{ guest.householdSize }}</span>
					<span>{{ base.language }}: {{ guestLanguageLabel(guest.locale) }}</span>
				</div>
				<div class="guest-actions">
					<span class="guest-status">{{ statusLabels[guest.status] }}</span>
					<VisitCommandButtons
						:locale="locale"
						:status="guest.status"
						:disabled="busy"
						@run="emit('run', guest, $event)"
					/>
				</div>
			</article>
		</div>
		<p v-else class="empty-state">{{ t.noGuests }}</p>
	</section>

	<AddGuestSection
		:locale="locale"
		:admissions="admissions"
		:busy="busy"
		@add-guest="emit('addGuest', $event)"
	/>
</template>

<style scoped>
.search-form {
	display: grid;
	grid-template-columns: 1fr auto;
	gap: 8px;
}
.search-form button {
	padding: 0 17px;
	border: 0;
	border-radius: 12px;
	color: white;
	background: var(--color-brand);
	font-weight: 700;
}
</style>
