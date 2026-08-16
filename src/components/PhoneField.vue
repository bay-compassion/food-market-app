<script setup lang="ts">
import { formatUsPhone } from '../services/phoneFormat';
import FormField from './FormField.vue';

/**
 * A `FormField` specialised for US phone numbers: it formats digits into `(555) 123-4567` as the
 * guest types, rather than leaving them to type the punctuation themselves. The app only serves
 * US guests today, so there's no attempt at other countries' formats.
 */
withDefaults(
	defineProps<{
		label: string;
		modelValue: string;
		required?: boolean;
		autocomplete?: string;
		placeholder?: string;
	}>(),
	{ required: false, autocomplete: 'tel', placeholder: '(555) 123-4567' },
);

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<template>
	<FormField
		:label="label"
		:model-value="modelValue"
		type="tel"
		inputmode="tel"
		:required="required"
		:autocomplete="autocomplete"
		:placeholder="placeholder"
		:format="formatUsPhone"
		@update:model-value="(value) => emit('update:modelValue', String(value))"
	/>
</template>
