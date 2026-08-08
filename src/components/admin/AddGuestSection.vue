<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { adminTranslations } from '../../adminLocales';
import type { Locale } from '../../locales';
import type { GuestAdmission } from '../../services/guestAdmission';
import ManualGuestForm from './ManualGuestForm.vue';
import type { ManualGuest } from './types';

/**
 * The "add a guest by hand" control, shared by every admin screen that offers it. What the
 * resulting visit looks like depends entirely on `admissions`, which the container derives from
 * how far the session has progressed — see `admissionsFor` in `services/guestAdmission.ts`.
 */
const props = defineProps<{ locale: Locale; admissions: GuestAdmission[]; busy?: boolean }>();
const emit = defineEmits<{ addGuest: [guest: ManualGuest] }>();

const t = computed(() => adminTranslations[props.locale]);
const showForm = ref(false);

// A session that cannot accept anyone right now offers no button at all.
const canAdd = computed(() => props.admissions.length > 0);

watch(canAdd, (allowed) => {
	if (!allowed) {
		showForm.value = false;
	}
});

function addGuest(guest: ManualGuest) {
	showForm.value = false;
	emit('addGuest', guest);
}
</script>

<template>
	<section v-if="canAdd" class="admin-section">
		<div class="section-heading">
			<h2>{{ t.addGuest }}</h2>
			<button v-if="!showForm" class="add-guest-button" type="button" @click="showForm = true">
				+ {{ t.addGuest }}
			</button>
		</div>
		<ManualGuestForm
			v-if="showForm"
			:locale="locale"
			:admissions="admissions"
			:busy="busy"
			@submit="addGuest"
			@cancel="showForm = false"
		/>
	</section>
</template>
