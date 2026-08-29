<script setup lang="ts">
import { computed } from 'vue';

import { fromMobx } from '@/stores/hooks/from-mobx.ts';
import { useTranslation } from '@/stores/hooks/use-translation.ts';
import type { RegistrationSubmitResult } from '@/stores/registration.store.ts';
import { useRootStore } from '@/stores/root.store.ts';

import AppButton from '../AppButton.vue';
import RegistrationCountdown from '../RegistrationCountdown.vue';
import GuestLotteryForm from './GuestLotteryForm.vue';
import GuestSignupForm from './GuestSignupForm.vue';

const props = defineProps<{
	/** Which flow this instance represents — changes the copy shown for the form, and whether the
	 *  lottery-entry fields render at all: "join the queue" only makes sense once registration is
	 *  genuinely open. */
	context: 'queue' | 'early';
	/** Ticked by the container so the countdown stays live; unused unless `context` is `'queue'`. */
	now: number;
}>();

const t = useTranslation();
const emit = defineEmits<{ submitted: [result: RegistrationSubmitResult] }>();

const rootStore = useRootStore();
const guestStore = rootStore.guest;
const registrationStore = rootStore.registration;
const session = rootStore.session;

const registrationQuestions = fromMobx(() => session.currentState?.questions ?? []);
/** When registration is genuinely open right now, the moment it closes; otherwise `null`. */
const registrationClosesAt = fromMobx(() => session.marketEvent?.registrationClosesAt ?? null);
const submissionError = fromMobx(() =>
	registrationStore.submissionError ? t.value.submissionError : '',
);

/** Whether this device has a cached local identity (name and phone) to prefill — hides the
 *  sign-up fields when so, since there's nothing left to ask. A device token alone isn't enough:
 *  a legacy token with no locally cached profile still needs to collect the fields. */
const showSignupFields = fromMobx(() => props.context === 'early' || guestStore.identity === null);

/** The strings that differ between joining today's queue and signing up ahead of time. */
const copy = fromMobx(() =>
	props.context === 'early'
		? {
				formTitle: t.value.earlyFormTitle,
				formDescription: t.value.earlyFormDescription,
				submit: t.value.earlySubmit,
				submitting: t.value.earlySubmitting,
			}
		: {
				formTitle: t.value.formTitle,
				formDescription: t.value.formDescription,
				submit: t.value.submit,
				submitting: t.value.submitting,
			},
);

async function handleSubmit() {
	const result = await registrationStore.submit(
		props.context,
		session.marketEvent?.id ?? null,
		rootStore.translations.locale,
	);

	emit('submitted', result);
}
</script>

<template>
	<form @submit.prevent="handleSubmit">
		<div class="form-heading">
			<RegistrationCountdown
				v-if="context === 'queue' && registrationClosesAt"
				:now="now"
				:closes-at="registrationClosesAt"
			/>
			<h2>{{ copy.formTitle }}</h2>
			<p>{{ copy.formDescription }}</p>
		</div>
		<GuestSignupForm v-if="showSignupFields" v-model:guest="registrationStore.guest" />
		<GuestLotteryForm
			v-if="context === 'queue'"
			v-model:guest="registrationStore.guest"
			v-model:registration-answers="registrationStore.registrationAnswers"
			:t="t"
			:registration-questions="registrationQuestions"
		/>
		<p v-if="submissionError" class="submission-error" role="alert">
			{{ submissionError }}
		</p>
		<AppButton type="submit" :disabled="registrationStore.isSubmitting">
			{{ registrationStore.isSubmitting ? copy.submitting : copy.submit }}
			<span aria-hidden="true">→</span>
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
.submission-error {
	margin: 0;
	color: var(--color-error);
	font-size: 13px;
	line-height: 1.4;
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
