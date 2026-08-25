<script setup lang="ts">
import { computed } from 'vue';

import type { Locale, Translation } from '../locales';
import type { VisitStatus } from '../services/visitStateMachine';
import NotificationOptIn from './guest-view/NotificationOptIn.vue';
import GuestClosedState from './GuestClosedState.vue';
import GuestRegistrationForm from './GuestRegistrationForm.vue';
import GuestVisitStatus from './GuestVisitStatus.vue';
import type { GuestFormState } from './types';

type ActiveVisit = {
	id: string;
	status: VisitStatus;
	queuePosition: number | null;
	aheadOfYou: number | null;
};

const props = defineProps<{
	t: Translation;
	locale: Locale;
	/** Which flow this instance represents — changes the copy shown for the form and its success
	 *  state, since "join the queue" doesn't make sense for a guest signing up ahead of time. */
	context: 'queue' | 'early';
	activeVisit: ActiveVisit | null;
	isSubmitted: boolean;
	isCalled: boolean;
	visitStatusLabel: string;
	queuePosition: number | null;
	guestsAhead: number | null;
	canCancelVisit: boolean;
	isCancelling: boolean;
	visitToken: string | null;
	/** Whether the form should render at all — either registration is open, or this is a
	 *  pre-registration view for a session that allows signing up ahead of time. */
	canShowForm: boolean;
	/** Whether to offer a way to sign up early from the closed state. */
	showPreregisterCta: boolean;
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

const emit = defineEmits<{ submit: []; 'cancel-visit': []; preregister: [] }>();

const guest = defineModel<GuestFormState>('guest', { required: true });
const pin = defineModel<string>('pin', { required: true });
const pinConfirmation = defineModel<string>('pinConfirmation', { required: true });
const registrationType = defineModel<'new' | 'returning'>('registrationType', { required: true });
const updateProfile = defineModel<boolean>('updateProfile', { required: true });
const registrationAnswers = defineModel<Record<string, string | number>>('registrationAnswers', {
	required: true,
});

/** The success-state copy differs between joining today's queue and signing up ahead of time. */
const successCopy = computed(() =>
	props.context === 'early'
		? { title: props.t.earlySuccessTitle, description: props.t.earlySuccessDescription }
		: { title: props.t.successTitle, description: props.t.successDescription },
);
</script>

<template>
	<section class="checkin-card" aria-live="polite">
		<GuestVisitStatus
			v-if="activeVisit && isSubmitted"
			:t="t"
			:is-called="isCalled"
			:success-title="successCopy.title"
			:success-description="successCopy.description"
			:visit-status-label="visitStatusLabel"
			:queue-position="queuePosition"
			:guests-ahead="guestsAhead"
			:can-cancel-visit="canCancelVisit"
			:is-cancelling="isCancelling"
			:submission-error="submissionError"
			@cancel-visit="emit('cancel-visit')"
		/>
		<GuestClosedState
			v-else-if="!canShowForm"
			:t="t"
			:show-preregister-cta="showPreregisterCta"
			@preregister="emit('preregister')"
		/>
		<GuestRegistrationForm
			v-else-if="canShowForm"
			v-model:guest="guest"
			v-model:pin="pin"
			v-model:pin-confirmation="pinConfirmation"
			v-model:registration-type="registrationType"
			v-model:update-profile="updateProfile"
			v-model:registration-answers="registrationAnswers"
			:t="t"
			:context="context"
			:registration-questions="registrationQuestions"
			:submission-error="submissionError"
			:is-submitting="isSubmitting"
			:now="now"
			:registration-closes-at="registrationClosesAt"
			@submit="emit('submit')"
		/>
		<!-- Consent is a guest characteristic, not a per-visit one, so this is available whenever
		     the guest is identified (a visit token exists), regardless of which state above is
		     showing — not only once there's an active visit to report status on. -->
		<NotificationOptIn v-if="visitToken" :visit-token="visitToken" :locale="locale" />
	</section>
</template>

<style scoped>
.checkin-card {
	padding: 32px 22px;
	border: 2px solid var(--color-brand);
	border-radius: var(--radius-lg);
	background: var(--color-background);
}
</style>
