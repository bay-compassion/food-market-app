<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRef } from 'vue';
import { useRouter } from 'vue-router';

import type { Locale } from '../../locales';
import {
	currentSessionPhase,
	guestFormContext,
	resolveGuestCardState,
} from '../../services/guestCardState';
import {
	cancelActiveVisit,
	fetchActiveVisit,
	type ActiveVisit,
} from '../../services/guestVisitApi';
import type { RegistrationSubmitResult } from '../../services/registration.store';
import { useRootStore } from '../../services/root.store';
import { guestVisitStatusLabel } from '../../services/visitStatusLabels';
import type { Language } from '../../stores/translation.store';
import GuestIdentityIndicator from './GuestIdentityIndicator.vue';
import GuestLanguageHero from './GuestLanguageHero.vue';
import GuestNotOpenState from './GuestNotOpenState.vue';
import GuestRegistrationClosedState from './GuestRegistrationClosedState.vue';
import GuestRegistrationForm from './GuestRegistrationForm.vue';
import GuestServiceState from './GuestServiceState.vue';
import GuestSignupCard from './GuestSignupCard.vue';
import GuestVisitStatus from './GuestVisitStatus.vue';

const rootStore = useRootStore();
const guestDomain = rootStore.guest;
const session = rootStore.session;
const translations = rootStore.translations;
const t = toRef(translations, 'translation');
const locale = toRef(translations, 'locale');
const isReturningVisitor = toRef(guestDomain, 'isReturningVisitor');

function selectLanguage(selected: Locale) {
	translations.setLanguage(selected as Language);
}

const visitTokenStorageKey = 'bay-compassion.visit-token';
let visitRefreshTimer: ReturnType<typeof setTimeout> | undefined;
let nowTimer: ReturnType<typeof setInterval> | undefined;

const isSubmitted = ref(false);
const isCancelling = ref(false);
/** Only ever set by `cancelVisit` — the registration form's own submission error lives on
 *  `rootStore.registration` and is displayed by `GuestRegistrationForm` itself. */
const visitError = ref('');
const activeVisit = ref<ActiveVisit | null>(null);
const isStatusLoading = ref(true);
const visitToken = ref<string | null>(window.localStorage.getItem(visitTokenStorageKey));
const guestIdentity = computed(() => guestDomain.identity);

/**
 * Whether `/api/market` has ever returned usable data. Stays `false` while it hasn't, including
 * when the optional configuration endpoint can't be reached — `phase` below treats that the same
 * as registration being open, so the form is still available rather than blocking a guest behind
 * a "not open" screen the app can't actually confirm.
 */
const hasLoadedRegistration = computed(() => session.currentState !== null);
/** Ticks every second so `GuestSignupCard`'s countdown stays live. */
const now = ref(Date.now());

const visitStatusLabel = computed(() => {
	if (!activeVisit.value) {
		return '';
	}

	return guestVisitStatusLabel(locale.value, activeVisit.value.status);
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
const router = useRouter();
const phase = computed(() =>
	hasLoadedRegistration.value
		? currentSessionPhase(session.marketEvent, new Date(now.value))
		: 'registration-open',
);
/**
 * Which of the signup card's states applies right now. An active visit always wins — see
 * `resolveGuestCardState` for the full precedence, which mirrors the server-side gate in
 * `guestRegistration.mts`. `isPreregistration` is always `false` here — the `/signup` route
 * renders `SignupView` instead, which is the only place that flag ever applies.
 */
const cardState = computed(() =>
	resolveGuestCardState({
		phase: phase.value,
		isIdentified: guestDomain.isIdentified,
		isPreregistration: false,
		hasActiveVisit: activeVisit.value !== null && isSubmitted.value,
	}),
);
/** The success-state copy differs between joining today's queue and signing up ahead of time. */
const successCopy = computed(() =>
	guestFormContext(phase.value) === 'early'
		? { title: t.value.earlySuccessTitle, description: t.value.earlySuccessDescription }
		: { title: t.value.successTitle, description: t.value.successDescription },
);

function goToSignup() {
	void router.push({ name: 'signup' });
}

function handleSubmitted(result: RegistrationSubmitResult) {
	if (result.kind !== 'registered') {
		return;
	}

	window.localStorage.setItem(visitTokenStorageKey, result.registration.visitToken);
	visitToken.value = result.registration.visitToken;
	activeVisit.value = {
		id: result.registration.id,
		status: result.registration.status,
		queuePosition: null,
		aheadOfYou: null,
	};
	isSubmitted.value = true;
	scheduleVisitRefresh();
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

	if (!token || !window.confirm(t.value.cancelVisitConfirm)) {
		return;
	}

	isCancelling.value = true;

	try {
		const visit = await cancelActiveVisit(token);

		activeVisit.value = { ...activeVisit.value!, ...visit };
	} catch {
		visitError.value = t.value.visitError;
	} finally {
		isCancelling.value = false;
	}
}

onMounted(async () => {
	nowTimer = setInterval(() => {
		now.value = Date.now();
	}, 1_000);
	await Promise.all([session.getStatus().catch(() => undefined), loadActiveVisit()]);
	isStatusLoading.value = false;
});
onBeforeUnmount(() => {
	clearTimeout(visitRefreshTimer);
	clearInterval(nowTimer);
});
</script>

<template>
	<section class="guest-layout">
		<GuestLanguageHero
			v-if="!isReturningVisitor"
			:t="t"
			:locale="locale"
			@select-language="selectLanguage"
		/>

		<GuestIdentityIndicator
			v-if="guestIdentity"
			:t="t"
			:locale="locale"
			:identity="guestIdentity"
		/>

		<p v-if="isStatusLoading" class="status-loading" aria-live="polite">{{ t.statusLoading }}</p>
		<template v-else>
			<template v-if="!session.isActive">
				<GuestSignupCard>
					<GuestNotOpenState :t="t" @preregister="goToSignup" />
				</GuestSignupCard>
			</template>
			<template v-else>
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
						:submission-error="visitError"
						@cancel-visit="cancelVisit"
					/>
					<GuestRegistrationForm
						v-else-if="cardState.kind === 'form'"
						:context="cardState.context"
						:now="now"
						@submitted="handleSubmitted"
					/>
					<GuestNotOpenState v-else-if="cardState.kind === 'not-open'" :t="t" />
					<GuestRegistrationClosedState
						v-else-if="cardState.kind === 'registration-closed'"
						:t="t"
					/>
					<GuestServiceState v-else :t="t" :has-ended="cardState.kind === 'ended'" />
				</GuestSignupCard>
			</template>
		</template>
	</section>
</template>
