<script setup lang="ts">
import { computed, reactive, watch } from 'vue';

import { AppButton, FormField, PhoneField } from '@/react-bridge/islands.ts';

import { adminTranslations } from '../../adminLocales';
import { translations, type Locale } from '../../locales';
import { ageRanges } from '../../services/ageRanges';
import type { GuestAdmission } from '../../services/guestAdmission';
import {
	lotteryWeightFor,
	lotteryWeightTiers,
	type LotteryWeightTier,
} from '../../services/lotteryWeight';
import type { ManualGuest } from './types';

const props = defineProps<{
	locale: Locale;
	/** The ways this session can accept a guest right now, most expected first. */
	admissions: GuestAdmission[];
	busy?: boolean;
}>();
const emit = defineEmits<{ submit: [guest: ManualGuest]; cancel: [] }>();

const t = computed(() => adminTranslations.en);
const base = computed(() => translations[props.locale]);
const guest = reactive<ManualGuest>({
	firstName: '',
	lastName: '',
	ageRange: '',
	householdSize: 1,
	childrenCount: 0,
	seniorsCount: 0,
	phone: '',
	queuePlacement: 'end',
	admission: props.admissions[0] ?? 'queue',
	lotteryWeightTier: 'standard',
});

const ageRangeLabels = computed<Record<(typeof ageRanges)[number], string>>(() => ({
	'0-17': base.value.ageRange0to17,
	'18-29': base.value.ageRange18to29,
	'30-44': base.value.ageRange30to44,
	'45-59': base.value.ageRange45to59,
	'60-74': base.value.ageRange60to74,
	'75+': base.value.ageRange75plus,
}));
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
const weightLabels = computed<Record<LotteryWeightTier, string>>(() => ({
	standard: t.value.weightStandard,
	higher: t.value.weightHigher,
	highest: t.value.weightHighest,
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

const ageOptions = computed(() => [
	{ value: '', label: base.value.agePlaceholder, disabled: true },
	...ageRanges.map((range) => ({ value: range, label: ageRangeLabels.value[range] })),
]);
</script>

<template>
	<form class="manual-form" @submit.prevent="submit">
		<h3>{{ t.manualGuestTitle }}</h3>
		<FormField v-model="guest.firstName" :label="base.firstName" required />
		<FormField v-model="guest.lastName" :label="base.lastName" required />
		<div class="field-row">
			<FormField
				v-model="guest.ageRange"
				:label="base.age"
				type="select"
				required
				:options="ageOptions"
			/>
			<FormField
				v-model="guest.householdSize"
				:label="base.household"
				type="number"
				:min="1"
				:max="30"
				required
			/>
		</div>
		<div class="field-row">
			<FormField
				v-model="guest.childrenCount"
				:label="base.childrenCount"
				type="number"
				:min="0"
				:max="30"
				required
			/><FormField
				v-model="guest.seniorsCount"
				:label="base.seniorsCount"
				type="number"
				:min="0"
				:max="30"
				required
			/>
		</div>
		<PhoneField v-model="guest.phone" :label="base.phone" required />
		<label v-if="admissions.length > 1">
			<span>{{ t.admissionLabel }}</span>
			<select v-model="guest.admission">
				<option v-for="admission in admissions" :key="admission" :value="admission">
					{{ admissionLabels[admission] }}
				</option>
			</select>
		</label>
		<p class="admission-help">{{ admissionHelp[guest.admission] }}</p>
		<!-- Odds only mean anything for a guest actually going into the draw. -->
		<template v-if="guest.admission === 'lottery'">
			<label>
				<span>{{ t.lotteryWeightLabel }}</span>
				<select v-model="guest.lotteryWeightTier">
					<option v-for="tier in lotteryWeightTiers" :key="tier" :value="tier">
						{{ weightLabels[tier] }} (×{{ lotteryWeightFor(tier) }})
					</option>
				</select>
			</label>
			<p class="admission-help">{{ t.lotteryWeightHelp }}</p>
		</template>
		<label v-if="guest.admission === 'queue'">
			<span>{{ t.queuePlacement }}</span>
			<select v-model="guest.queuePlacement">
				<option value="end">{{ t.placeEnd }}</option>
				<option value="next">{{ t.placeNext }}</option>
			</select>
		</label>
		<div class="manual-actions">
			<button type="button" @click="emit('cancel')">{{ t.cancel }}</button
			><AppButton type="submit" :disabled="busy" :label="t.saveGuest" />
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
