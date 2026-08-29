<script setup lang="ts">
import { computed } from 'vue';

import { CollapsingCountField, FormField } from '@/react-bridge/islands.ts';

import type { Translation } from '../../locales';
import { ageRanges } from '../../services/ageRanges';
import type { GuestFormState } from '../types';

const props = defineProps<{
	t: Translation;
	registrationQuestions: {
		id: string;
		prompt: string;
		type: 'text' | 'scale';
		required: boolean;
	}[];
}>();

const guest = defineModel<GuestFormState>('guest', { required: true });
const registrationAnswers = defineModel<Record<string, string | number>>('registrationAnswers', {
	required: true,
});

const ageRangeLabels = computed<Record<(typeof ageRanges)[number], string>>(() => ({
	'0-17': props.t.ageRange0to17,
	'18-29': props.t.ageRange18to29,
	'30-44': props.t.ageRange30to44,
	'45-59': props.t.ageRange45to59,
	'60-74': props.t.ageRange60to74,
	'75+': props.t.ageRange75plus,
}));

const ageOptions = computed(() => [
	{ value: '', label: props.t.agePlaceholder, disabled: true },
	...ageRanges.map((range) => ({ value: range, label: ageRangeLabels.value[range] })),
]);
</script>

<template>
	<FormField v-model="guest.ageRange" :label="t.age" type="select" required :options="ageOptions" />
	<CollapsingCountField
		v-model="guest.householdSize"
		:label="t.household"
		:hint="t.householdHint"
		:options="[1, 2, 3, 4]"
		required
		:max="30"
		:other-label="t.countOtherLabel"
		:other-placeholder="t.countOtherPlaceholder"
		:back-label="t.countBackLabel"
	/>
	<CollapsingCountField
		v-model="guest.childrenCount"
		:label="t.childrenCount"
		required
		:max="30"
		:other-label="t.countOtherLabel"
		:other-placeholder="t.countOtherPlaceholder"
		:back-label="t.countBackLabel"
	/>
	<CollapsingCountField
		v-model="guest.seniorsCount"
		:label="t.seniorsCount"
		required
		:max="30"
		:other-label="t.countOtherLabel"
		:other-placeholder="t.countOtherPlaceholder"
		:back-label="t.countBackLabel"
	/>
	<label v-for="question in registrationQuestions" :key="question.id" class="dynamic-question">
		<span>{{ question.prompt }}</span>
		<select
			v-if="question.type === 'scale'"
			v-model.number="registrationAnswers[question.id]"
			:required="question.required"
		>
			<option value="" disabled>{{ t.chooseAnswer }}</option>
			<option v-for="value in 10" :key="value" :value="value">{{ value }}</option>
		</select>
		<textarea
			v-else
			v-model.trim="registrationAnswers[question.id]"
			:required="question.required"
			rows="3"
		></textarea>
	</label>
</template>

<style scoped>
.dynamic-question {
	display: grid;
	gap: 8px;
}
.dynamic-question > span {
	font-family: var(--font-heading);
	font-size: 16px;
	font-weight: 700;
}
.dynamic-question select,
.dynamic-question textarea {
	width: 100%;
	padding: 14px 16px;
	border: 2px solid var(--color-border);
	border-radius: var(--radius-md);
	color: var(--color-text);
	background: var(--color-background);
	font-family: var(--font-body);
	font-size: 16px;
	font-weight: 400;
}
</style>
