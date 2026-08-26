<script setup lang="ts">
import { computed } from 'vue';

import type { Translation } from '../../locales';
import AppButton from '../AppButton.vue';
import RegistrationCountdown from '../RegistrationCountdown.vue';
import type { GuestFormState } from '../types';
import GuestLotteryForm from './GuestLotteryForm.vue';
import GuestSignupForm from './GuestSignupForm.vue';

const props = defineProps<{
	t: Translation;
	/** Which flow this instance represents — changes the copy shown for the form, and whether the
	 *  lottery-entry fields render at all: "join the queue" only makes sense once registration is
	 *  genuinely open. */
	context: 'queue' | 'early';
	/** Whether this device has a cached local identity (name and phone) to prefill — hides the
	 *  sign-up fields when so, since there's nothing left to ask. A device token alone isn't
	 *  enough: a legacy token with no locally cached profile still needs to collect the fields. */
	isIdentified: boolean;
	registrationQuestions: {
		id: string;
		prompt: string;
		type: 'text' | 'scale';
		required: boolean;
	}[];
	submissionError: string;
	isSubmitting: boolean;
	/** Ticked by the container so the countdown stays live; unused unless `registrationClosesAt` is set. */
	now: number;
	/** When registration is genuinely open right now, the moment it closes; otherwise `null`. */
	registrationClosesAt: Date | null;
}>();

const emit = defineEmits<{ submit: [] }>();

const guest = defineModel<GuestFormState>('guest', { required: true });
const registrationAnswers = defineModel<Record<string, string | number>>('registrationAnswers', {
	required: true,
});

const showSignupFields = computed(() => props.context === 'early' || !props.isIdentified);

/** The strings that differ between joining today's queue and signing up ahead of time. */
const copy = computed(() =>
	props.context === 'early'
		? {
				formTitle: props.t.earlyFormTitle,
				formDescription: props.t.earlyFormDescription,
				submit: props.t.earlySubmit,
				submitting: props.t.earlySubmitting,
			}
		: {
				formTitle: props.t.formTitle,
				formDescription: props.t.formDescription,
				submit: props.t.submit,
				submitting: props.t.submitting,
			},
);
</script>

<template>
	<form @submit.prevent="emit('submit')">
		<div class="form-heading">
			<RegistrationCountdown
				v-if="context === 'queue' && registrationClosesAt"
				:t="t"
				:now="now"
				:closes-at="registrationClosesAt"
			/>
			<h2>{{ copy.formTitle }}</h2>
			<p>{{ copy.formDescription }}</p>
		</div>
		<GuestSignupForm v-if="showSignupFields" v-model:guest="guest" :t="t" />
		<GuestLotteryForm
			v-if="context === 'queue'"
			v-model:guest="guest"
			v-model:registration-answers="registrationAnswers"
			:t="t"
			:registration-questions="registrationQuestions"
		/>
		<p v-if="submissionError" class="submission-error" role="alert">
			{{ submissionError }}
		</p>
		<AppButton type="submit" :disabled="isSubmitting">
			{{ isSubmitting ? copy.submitting : copy.submit }} <span aria-hidden="true">→</span>
		</AppButton>
		<p class="privacy">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<rect x="5" y="10" width="14" height="10" rx="2" />
				<path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg
			>{{ t.privacy }}
		</p>
	</form>
</template>

<style scoped>
.form-heading {
	margin-bottom: 8px;
}
.form-heading h2 {
	margin-bottom: 9px;
	font-family: var(--font-heading);
	font-size: 29px;
	letter-spacing: -0.01em;
	text-transform: uppercase;
	color: var(--color-text);
}
.form-heading p {
	color: var(--color-text-muted);
	font-size: 16px;
	line-height: 1.55;
}
form {
	display: grid;
	gap: 18px;
}
.privacy {
	display: flex;
	align-items: flex-start;
	gap: 8px;
	margin: 0;
	color: var(--color-text-muted);
	font-size: 13px;
	line-height: 1.5;
}
.privacy svg {
	flex: 0 0 auto;
	width: 16px;
	margin-top: 1px;
}
</style>
