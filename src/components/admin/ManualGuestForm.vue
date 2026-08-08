<script setup lang="ts">
import { computed, reactive } from 'vue';

import { adminTranslations } from '../../adminLocales';
import { translations, type Locale } from '../../locales';
import AppButton from '../AppButton.vue';
import FormField from '../FormField.vue';
import type { ManualGuest } from './types';

const props = defineProps<{ locale: Locale; busy?: boolean; showPlacement?: boolean }>();
const emit = defineEmits<{ submit: [guest: ManualGuest]; cancel: [] }>();

const t = computed(() => adminTranslations[props.locale]);
const base = computed(() => translations[props.locale]);
const guest = reactive<ManualGuest>({
	firstName: '',
	lastName: '',
	age: '',
	householdSize: 1,
	phone: '',
	queuePlacement: 'end',
});

function submit() {
	emit('submit', { ...guest });
}
</script>

<template>
	<form class="manual-form" @submit.prevent="submit">
		<h3>{{ t.manualGuestTitle }}</h3>
		<FormField v-model="guest.firstName" :label="base.firstName" required />
		<FormField v-model="guest.lastName" :label="base.lastName" required />
		<div class="field-row">
			<FormField
				v-model="guest.age"
				:label="base.age"
				type="number"
				:min="0"
				:max="120"
				required
			/><FormField
				v-model="guest.householdSize"
				:label="base.household"
				type="number"
				:min="1"
				:max="30"
				required
			/>
		</div>
		<FormField v-model="guest.phone" :label="base.phone" type="tel" required />
		<label v-if="showPlacement">
			<span>{{ t.queuePlacement }}</span>
			<select v-model="guest.queuePlacement">
				<option value="end">{{ t.placeEnd }}</option>
				<option value="next">{{ t.placeNext }}</option>
			</select>
		</label>
		<div class="manual-actions">
			<button type="button" @click="emit('cancel')">{{ t.cancel }}</button
			><AppButton type="submit" :disabled="busy">{{ t.saveGuest }}</AppButton>
		</div>
	</form>
</template>
