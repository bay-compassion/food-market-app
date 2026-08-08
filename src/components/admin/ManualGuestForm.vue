<script setup lang="ts">
import { computed, reactive, watch } from 'vue';

import { adminTranslations } from '../../adminLocales';
import { translations, type Locale } from '../../locales';
import type { GuestAdmission } from '../../services/guestAdmission';
import AppButton from '../AppButton.vue';
import FormField from '../FormField.vue';
import type { ManualGuest } from './types';

const props = defineProps<{
	locale: Locale;
	/** The ways this session can accept a guest right now, most expected first. */
	admissions: GuestAdmission[];
	busy?: boolean;
}>();
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
	admission: props.admissions[0] ?? 'queue',
});

const admissionLabels = computed<Record<GuestAdmission, string>>(() => ({
	lottery: t.value.admitToLottery,
	queue: t.value.admitToQueue,
	served: t.value.admitAsServed,
}));
const admissionHelp = computed<Record<GuestAdmission, string>>(() => ({
	lottery: t.value.admitToLotteryHelp,
	queue: t.value.admitToQueueHelp,
	served: t.value.admitAsServedHelp,
}));

// The session can move on while the form sits open, so never leave an illegal choice selected.
watch(
	() => props.admissions,
	(admissions) => {
		if (!admissions.includes(guest.admission)) {
			guest.admission = admissions[0] ?? 'queue';
		}
	},
);

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
		<label v-if="admissions.length > 1">
			<span>{{ t.admissionLabel }}</span>
			<select v-model="guest.admission">
				<option v-for="admission in admissions" :key="admission" :value="admission">
					{{ admissionLabels[admission] }}
				</option>
			</select>
		</label>
		<p class="admission-help">{{ admissionHelp[guest.admission] }}</p>
		<label v-if="guest.admission === 'queue'">
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

<style scoped>
.admission-help {
	margin: -6px 0 0;
	color: var(--color-text-subtle);
	font-size: 14px;
	line-height: 1.5;
}
</style>
