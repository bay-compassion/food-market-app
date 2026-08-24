<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import type { Locale, Translation } from '../../locales';
import {
	cancelActiveVisit,
	fetchActiveVisit,
	fetchMarketRegistration,
	submitGuestRegistration,
	type ActiveVisit,
	type MarketEventTiming,
	type RegistrationQuestion,
} from '../../services/guestVisitApi';
import { automaticSessionStatus } from '../../services/sessionStateMachine';
import { guestVisitStatusLabel } from '../../services/visitStatusLabels';
import GuestSignupCard from '../GuestSignupCard.vue';
import type { GuestFormState } from '../types';
import GuestLanguageHero from './GuestLanguageHero.vue';

const props = defineProps<{
	t: Translation;
	locale: Locale;
	isReturningVisitor: boolean;
}>();
defineEmits<{ 'select-language': [locale: Locale] }>();

const visitTokenStorageKey = 'bay-compassion.visit-token';
let registrationRefreshTimer: ReturnType<typeof setTimeout> | undefined;
let registrationPollTimer: ReturnType<typeof setInterval> | undefined;
let visitRefreshTimer: ReturnType<typeof setTimeout> | undefined;
let countdownTimer: ReturnType<typeof setInterval> | undefined;
/**
 * How often to re-check `/api/market` while registration is open. `registrationRefreshTimer`
 * above only fires at the transition it knew about at the time it was scheduled — it can't know
 * about an admin closing registration early or extending the window after the fact. This polls
 * only while `registrationAvailable` is true, so a session that's closed, scheduled, or between
 * markets never triggers an unnecessary function invocation.
 */
const registrationPollIntervalMs = 30_000;

const isSubmitted = ref(false);
const isSubmitting = ref(false);
const isCancelling = ref(false);
const submissionError = ref('');
const registrationType = ref<'new' | 'returning'>('new');
const pin = ref('');
const pinConfirmation = ref('');
const updateProfile = ref(false);
const activeVisit = ref<ActiveVisit | null>(null);
const isStatusLoading = ref(true);
const visitToken = ref<string | null>(window.localStorage.getItem(visitTokenStorageKey));
const marketEvent = ref<MarketEventTiming | null>(null);
const registrationAvailable = ref(true);
/** Ticks while registration is open so `GuestSignupCard`'s countdown stays live. */
const now = ref(Date.now());
const registrationQuestions = ref<RegistrationQuestion[]>([]);
const registrationAnswers = ref<Record<string, string | number>>({});
const guest = ref<GuestFormState>({
	firstName: '',
	lastName: '',
	ageRange: '',
	householdSize: '',
	childrenCount: '',
	seniorsCount: '',
	phone: '',
});

const visitStatusLabel = computed(() => {
	if (!activeVisit.value) {
		return '';
	}

	return guestVisitStatusLabel(props.locale, activeVisit.value.status);
});
const canCancelVisit = computed(
	() => activeVisit.value?.status === 'registered' || activeVisit.value?.status === 'waiting',
);
/**
 * A called guest still needs updates — refreshing only while the visit can be cancelled meant the
 * screen froze on "Called" and never moved on.
 */
const isVisitActive = computed(
	() =>
		activeVisit.value?.status === 'registered' ||
		activeVisit.value?.status === 'waiting' ||
		activeVisit.value?.status === 'called',
);
const isCalled = computed(() => activeVisit.value?.status === 'called');
const queuePosition = computed(() =>
	activeVisit.value?.status === 'waiting' ? activeVisit.value.queuePosition : null,
);
const guestsAhead = computed(() =>
	activeVisit.value?.status === 'waiting' ? activeVisit.value.aheadOfYou : null,
);
function scheduleVisitRefresh() {
	if (visitRefreshTimer) {
		clearTimeout(visitRefreshTimer);
	}
	if (isVisitActive.value) {
		visitRefreshTimer = setTimeout(loadActiveVisit, 15_000);
	}
}
const route = useRoute();
const router = useRouter();
const isPreregistration = computed(() => route.name === 'signup');
/**
 * Mirrors the server-side gate in `guestRegistration.mts`: a guest may sign up as soon as an event
 * exists at all, including `draft`, and only loses the ability once the window has genuinely
 * passed.
 */
const canPreregister = computed(() => {
	if (!marketEvent.value) {
		return false;
	}
	const status = automaticSessionStatus(marketEvent.value, new Date());

	return status !== 'registration_closed' && status !== 'service_started' && status !== 'ended';
});
const canShowForm = computed(
	() => registrationAvailable.value || (isPreregistration.value && canPreregister.value),
);
const showPreregisterCta = computed(() => !isPreregistration.value && canPreregister.value);
/**
 * Whether a guest is actually joining today's queue or signing up ahead of the window — decided by
 * whether registration is genuinely open right now, not by which route got them here, so a guest
 * who happens to still be on `/signup` once registration opens sees the ordinary queue copy.
 */
const formContext = computed(() => (registrationAvailable.value ? 'queue' : 'early'));

/** Resets the card to the empty form, e.g. so the header brand link can act as a "start over". */
function resetToForm() {
	isSubmitted.value = false;
}

function goToSignup() {
	void router.push({ name: 'signup' });
}

async function submitForm() {
	isSubmitting.value = true;
	submissionError.value = '';

	try {
		if (registrationType.value === 'new' && pin.value !== pinConfirmation.value) {
			submissionError.value = props.t.pinMismatch;

			return;
		}
		const registration = await submitGuestRegistration({
			...guest.value,
			locale: props.locale,
			marketEventId: marketEvent.value?.id ?? null,
			answers: registrationAnswers.value,
			source: 'self',
			registrationType: registrationType.value,
			pin: pin.value,
			updateProfile: registrationType.value === 'returning' && updateProfile.value,
		});
		window.localStorage.setItem(visitTokenStorageKey, registration.visitToken);
		visitToken.value = registration.visitToken;
		activeVisit.value = {
			id: registration.id,
			status: registration.status,
			queuePosition: null,
			aheadOfYou: null,
		};
		isSubmitted.value = true;
		scheduleVisitRefresh();
	} catch {
		submissionError.value = props.t.submissionError;
	} finally {
		isSubmitting.value = false;
	}
}

async function loadActiveVisit() {
	const token = window.localStorage.getItem(visitTokenStorageKey);
	if (!token) {
		return;
	}
	const lookup = await fetchActiveVisit(token);
	if (!lookup.found) {
		if (lookup.reason === 'unreachable') {
			// Keep registration available if status refresh is temporarily unavailable.
			return;
		}
		window.localStorage.removeItem(visitTokenStorageKey);
		visitToken.value = null;
		activeVisit.value = null;
		isSubmitted.value = false;
		scheduleVisitRefresh();

		return;
	}
	activeVisit.value = lookup.visit;
	isSubmitted.value = true;
	scheduleVisitRefresh();
}

async function cancelVisit() {
	const token = window.localStorage.getItem(visitTokenStorageKey);
	if (!token || !window.confirm(props.t.cancelVisitConfirm)) {
		return;
	}

	isCancelling.value = true;
	try {
		const visit = await cancelActiveVisit(token);
		activeVisit.value = { ...activeVisit.value!, ...visit };
	} catch {
		submissionError.value = props.t.visitError;
	} finally {
		isCancelling.value = false;
	}
}

async function loadRegistration() {
	const registration = await fetchMarketRegistration();
	if (!registration) {
		// Keep the form available when the optional configuration endpoint cannot be reached.
		return;
	}

	marketEvent.value = registration.event;
	registrationQuestions.value = registration.questions;
	const now = new Date();
	registrationAvailable.value = Boolean(
		registration.event &&
		registration.event.status === 'registration_open' &&
		now >= registration.event.registrationOpensAt &&
		now <= registration.event.registrationClosesAt,
	);
	if (registrationAvailable.value) {
		if (!registrationPollTimer) {
			registrationPollTimer = setInterval(loadRegistration, registrationPollIntervalMs);
		}
	} else if (registrationPollTimer) {
		clearInterval(registrationPollTimer);
		registrationPollTimer = undefined;
	}
	if (registrationRefreshTimer) {
		clearTimeout(registrationRefreshTimer);
	}
	const nextTransitionAt =
		registration.event?.status === 'scheduled'
			? registration.event.registrationOpensAt
			: registration.event?.status === 'registration_open'
				? registration.event.registrationClosesAt
				: null;
	if (nextTransitionAt && nextTransitionAt > now) {
		registrationRefreshTimer = setTimeout(
			loadRegistration,
			Math.min(nextTransitionAt.valueOf() - now.valueOf() + 250, 2_147_000_000),
		);
	}
}

onMounted(async () => {
	countdownTimer = setInterval(() => {
		now.value = Date.now();
	}, 1_000);
	await Promise.all([loadRegistration(), loadActiveVisit()]);
	isStatusLoading.value = false;
});
onBeforeUnmount(() => {
	clearTimeout(registrationRefreshTimer);
	clearInterval(registrationPollTimer);
	clearTimeout(visitRefreshTimer);
	clearInterval(countdownTimer);
});

defineExpose({ resetToForm });
</script>

<template>
	<section class="guest-layout">
		<p v-if="isStatusLoading" class="status-loading" aria-live="polite">{{ t.statusLoading }}</p>
		<template v-else>
			<GuestLanguageHero
				v-if="!isReturningVisitor"
				:t="t"
				:locale="locale"
				@select-language="$emit('select-language', $event)"
			/>

			<GuestSignupCard
				v-model:guest="guest"
				v-model:pin="pin"
				v-model:pin-confirmation="pinConfirmation"
				v-model:registration-type="registrationType"
				v-model:update-profile="updateProfile"
				v-model:registration-answers="registrationAnswers"
				:t="t"
				:locale="locale"
				:context="formContext"
				:active-visit="activeVisit"
				:is-submitted="isSubmitted"
				:is-called="isCalled"
				:visit-status-label="visitStatusLabel"
				:queue-position="queuePosition"
				:guests-ahead="guestsAhead"
				:can-cancel-visit="canCancelVisit"
				:is-cancelling="isCancelling"
				:visit-token="visitToken"
				:can-show-form="canShowForm"
				:show-preregister-cta="showPreregisterCta"
				:registration-questions="registrationQuestions"
				:submission-error="submissionError"
				:is-submitting="isSubmitting"
				:now="now"
				:registration-closes-at="marketEvent?.registrationClosesAt ?? null"
				@submit="submitForm"
				@cancel-visit="cancelVisit"
				@preregister="goToSignup"
			/>
		</template>
	</section>
</template>
