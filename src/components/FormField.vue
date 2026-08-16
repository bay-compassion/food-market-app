<script setup lang="ts">
import { parseNumericInput } from '../services/numericInput';

const props = withDefaults(
	defineProps<{
		label: string;
		modelValue: string | number;
		type?: string;
		required?: boolean;
		min?: number | string;
		max?: number | string;
		inputmode?: 'text' | 'numeric' | 'tel' | 'none' | 'decimal' | 'search' | 'email' | 'url';
		autocomplete?: string;
		placeholder?: string;
		/** Transforms the raw typed text before it's emitted, e.g. formatting phone number digits
		 *  into `(555) 123-4567`. Written back onto the input element itself rather than left to
		 *  `:value` to reapply: Vue only patches an input's DOM value when the emitted model actually
		 *  changes, so a keystroke the formatter rejects outright (a stray letter, an eleventh digit)
		 *  would otherwise sit visibly in the field even though the model stayed correct. */
		format?: (value: string) => string;
	}>(),
	{ type: 'text', required: false },
);

const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>();

function onInput(event: Event) {
	const target = event.target as HTMLInputElement | HTMLSelectElement;

	if (props.format) {
		const formatted = props.format(target.value);

		target.value = formatted;
		emit('update:modelValue', formatted);

		return;
	}

	const value = target.value;

	emit('update:modelValue', props.type === 'number' ? parseNumericInput(value) : value.trim());
}
</script>

<template>
	<label class="form-field">
		<span>{{ label }}</span>
		<select v-if="type === 'select'" :value="modelValue" :required="required" @change="onInput">
			<slot />
		</select>
		<input
			v-else
			:value="modelValue"
			:type="type"
			:required="required"
			:min="min"
			:max="max"
			:inputmode="inputmode"
			:autocomplete="autocomplete"
			:placeholder="placeholder"
			@input="onInput"
		/>
	</label>
</template>

<style scoped>
.form-field {
	display: grid;
	gap: 8px;
	color: var(--color-text);
}
.form-field > span {
	font-family: var(--font-heading);
	font-size: 16px;
	font-weight: 700;
}
.form-field input,
.form-field select {
	width: 100%;
	height: 58px;
	padding: 0 16px;
	color: var(--color-text);
	font-family: var(--font-body);
	font-size: 16px;
	font-weight: 400;
	border: 2px solid var(--color-border);
	border-radius: var(--radius-md);
	outline: 0;
	background: var(--color-background);
}
.form-field input::placeholder {
	color: var(--color-placeholder);
}
</style>
