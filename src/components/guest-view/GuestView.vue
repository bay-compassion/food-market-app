<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import type { Locale, Translation } from '../../locales';
import {
	currentSessionPhase,
	guestFormContext,
	resolveGuestCardState,
} from '../../services/guestCardState';
import {
	cancelActiveVisit,
	fetchActiveVisit,
	fetchMarketRegistration,
	submitGuestRegistration,
	type ActiveVisit,
	type MarketEventTiming,
	type RegistrationQuestion,
} from '../../services/guestVisitApi';
import { guestVisitStatusLabel } from '../../services/visitStatusLabels';
import type { GuestFormState } from '../types';
import GuestLanguageHero from './GuestLanguageHero.vue';
import GuestNotificationCard from './GuestNotificationCard.vue';
import GuestNotOpenState from './GuestNotOpenState.vue';
import GuestRegistrationClosedState from './GuestRegistrationClosedState.vue';
import GuestRegistrationForm from './GuestRegistrationForm.vue';
import GuestServiceState from './GuestServiceState.vue';
import GuestSignupCard from './GuestSignupCard.vue';
import GuestVisitStatus from './GuestVisitStatus.vue';
import ScheduleInformation from './ScheduleInformation.vue';

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
 * only while the session phase is `registration-open`, so a session that's closed, scheduled, or
 * between markets never triggers an unnecessary function invocation.
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
/**
 * Whether `/api/market` has ever returned usable data. Stays `false` while it hasn't, including
 * when the optional configuration endpoint can't be reached — `phase` below treats that the same
 * as registration being open, so the form is still available rather than blocking a guest behind
 * a "not open" screen the app can't actually confirm.
 */
const hasLoadedRegistration = ref(false);
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
const phase = computed(() =>
	hasLoadedRegistration.value
		? currentSessionPhase(marketEvent.value, new Date(now.value))
		: 'registration-open',
);
/**
 * Which of the signup card's states applies right now. An active visit always wins — see
 * `resolveGuestCardState` for the full precedence, which mirrors the server-side gate in
 * `guestRegistration.mts`.
 */
const cardState = computed(() =>
	resolveGuestCardState({
		phase: phase.value,
		marketEvent: marketEvent.value,
		isPreregistration: isPreregistration.value,
		// `isSubmitted` is a separate flag, not derived from `activeVisit`, so `resetToForm` can put
		// the card back in front of the form (e.g. to register another household member) without
		// discarding the visit that's still being tracked and refreshed in the background.
		hasActiveVisit: activeVisit.value !== null && isSubmitted.value,
	}),
);
/**
 * A schedule reminder shown above the rest of the screen whenever there's nothing actionable to
 * do right now — before the window opens, after it closes but before the lottery runs, and once
 * the session has ended. Hidden while registration is open (the signup form is live) and while
 * service is underway, since its "sign-ups aren't open yet" copy would contradict either.
 */
const showScheduleInformation = computed(
	() => phase.value !== 'registration-open' && phase.value !== 'in-service',
);
/** The success-state copy differs between joining today's queue and signing up ahead of time. */
const successCopy = computed(() =>
	guestFormContext(phase.value) === 'early'
		? { title: props.t.earlySuccessTitle, description: props.t.earlySuccessDescription }
		: { title: props.t.successTitle, description: props.t.successDescription },
);

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
	hasLoadedRegistration.value = true;
	if (phase.value === 'registration-open') {
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
	const loadedAt = new Date();
	const nextTransitionAt =
		registration.event?.status === 'scheduled'
			? registration.event.registrationOpensAt
			: registration.event?.status === 'registration_open'
				? registration.event.registrationClosesAt
				: null;
	if (nextTransitionAt && nextTransitionAt > loadedAt) {
		registrationRefreshTimer = setTimeout(
			loadRegistration,
			Math.min(nextTransitionAt.valueOf() - loadedAt.valueOf() + 250, 2_147_000_000),
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
			<ScheduleInformation v-if="showScheduleInformation" :t="t" />

			<GuestLanguageHero
				v-if="!isReturningVisitor"
				:t="t"
				:locale="locale"
				@select-language="$emit('select-language', $event)"
			/>

			<GuestSignupCard>
				<GuestVisitStatus
					v-if="cardState.kind === 'visit-status'"
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
					@cancel-visit="cancelVisit"
				/>
				<GuestRegistrationForm
					v-else-if="cardState.kind === 'form'"
					v-model:guest="guest"
					v-model:pin="pin"
					v-model:pin-confirmation="pinConfirmation"
					v-model:registration-type="registrationType"
					v-model:update-profile="updateProfile"
					v-model:registration-answers="registrationAnswers"
					:t="t"
					:context="cardState.context"
					:registration-questions="registrationQuestions"
					:submission-error="submissionError"
					:is-submitting="isSubmitting"
					:now="now"
					:registration-closes-at="marketEvent?.registrationClosesAt ?? null"
					@submit="submitForm"
				/>
				<GuestNotOpenState
					v-else-if="cardState.kind === 'not-open'"
					:t="t"
					:show-preregister-cta="cardState.showPreregisterCta"
					@preregister="goToSignup"
				/>
				<GuestRegistrationClosedState v-else-if="cardState.kind === 'registration-closed'" :t="t" />
				<GuestServiceState v-else :t="t" :has-ended="cardState.kind === 'ended'" />
			</GuestSignupCard>

			<GuestNotificationCard :locale="locale" :visit-token="visitToken" />
		</template>
	</section>
</template>
