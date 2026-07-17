<script setup lang="ts">
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
	}>(),
	{ type: 'text', required: false },
);

const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>();

function toNumber(value: string): string | number {
	const parsed = Number.parseFloat(value);

	return Number.isNaN(parsed) ? value : parsed;
}

function onInput(event: Event) {
	const value = (event.target as HTMLInputElement).value;

	emit('update:modelValue', props.type === 'number' ? toNumber(value) : value.trim());
}
</script>

<template>
	<label class="form-field">
		<span>{{ label }}</span>
		<input
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
	font-family: var(--font-heading);
	font-size: 14.5px;
	font-weight: 700;
}
.form-field input {
	width: 100%;
	height: 58px;
	padding: 0 16px;
	color: var(--color-text);
	border: 2px solid var(--color-border);
	border-radius: var(--radius-md);
	outline: 0;
	background: var(--color-background);
}
.form-field input::placeholder {
	color: var(--color-placeholder);
}
</style>
