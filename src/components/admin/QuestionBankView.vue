<script setup lang="ts">
import { computed } from 'vue';

import { AppButton } from '@/react-bridge/islands.ts';

import { adminTranslations } from '../../adminLocales';
import type { Locale } from '../../locales';
import type { Question } from './types';

const props = defineProps<{ locale: Locale; busy?: boolean; editable: boolean }>();
const questions = defineModel<Question[]>('questions', { required: true });
const emit = defineEmits<{ save: [] }>();

const t = computed(() => adminTranslations.en);

function addQuestion() {
	questions.value.push({ prompt: '', type: 'text', required: false });
}
</script>

<template>
	<section class="admin-section settings-card">
		<div class="questions-heading">
			<h2>{{ t.questions }}</h2>
			<button type="button" @click="addQuestion">+ {{ t.addQuestion }}</button>
		</div>
		<form @submit.prevent="emit('save')">
			<div v-for="(question, index) in questions" :key="question.id ?? index" class="question-row">
				<input v-model.trim="question.prompt" :placeholder="t.questionPlaceholder" required />
				<select v-model="question.type">
					<option value="text">{{ t.textAnswer }}</option>
					<option value="scale">{{ t.scaleAnswer }}</option>
				</select>
				<label class="check-label">
					<input v-model="question.required" type="checkbox" /> {{ t.required }}
				</label>
				<button class="remove-button" type="button" @click="questions.splice(index, 1)">
					{{ t.remove }}
				</button>
			</div>
			<AppButton type="submit" :disabled="busy || !editable" :label="t.saveSettings" />
		</form>
	</section>
</template>

<style scoped>
.questions-heading {
	display: flex;
	justify-content: space-between;
	gap: 14px;
	align-items: center;
	margin-top: 5px;
}
.questions-heading h3 {
	margin: 0;
	font-family: var(--font-heading);
	text-transform: uppercase;
}
.questions-heading button,
.remove-button {
	border: 0;
	color: var(--color-brand);
	background: transparent;
	font-weight: 700;
}
.question-row {
	display: grid;
	gap: 8px;
	padding: 12px;
	border-radius: var(--radius-md);
	background: #f3f6f4;
}
.question-row .check-label {
	display: flex;
	align-items: center;
}
.check-label input {
	width: 20px;
	min-height: 20px;
}
.remove-button {
	justify-self: start;
	color: var(--color-error);
	padding: 5px 0;
}
@media (min-width: 560px) {
	.question-row {
		grid-template-columns: minmax(0, 2fr) 1fr auto auto;
		align-items: center;
	}
}
</style>
