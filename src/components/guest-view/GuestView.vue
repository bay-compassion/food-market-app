<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, toRef } from 'vue';
import { useRouter } from 'vue-router';

import Card from '@/components/ui/layout/Card.vue';

import type { Locale } from '../../locales';
import {
	currentSessionPhase,
	guestFormContext,
	resolveGuestCardState,
} from '../../services/guestCardState';
import { SessionStatusEnum } from '../../services/sessionStateMachine';
import type { RegistrationSubmitResult } from '../../stores/registration.store';
import { useRootStore } from '../../stores/root.store';
import type { Language } from '../../stores/translation.store';
import GuestIdentityIndicator from './GuestIdentityIndicator.vue';
import GuestLanguageHero from './GuestLanguageHero.vue';
import GuestNotOpenState from './GuestNotOpenState.vue';
import GuestRegistrationClosedState from './GuestRegistrationClosedState.vue';
import GuestRegistrationForm from './GuestRegistrationForm.vue';
import GuestServiceState from './GuestServiceState.vue';
import GuestVisitStatus from './GuestVisitStatus.vue';

const rootStore = useRootStore();
const guestDomain = rootStore.guest;
const session = rootStore.session;
const visitStore = rootStore.visit;
const translations = rootStore.translations;
const t = toRef(translations, 'translation');
const locale = toRef(translations, 'locale');
const isReturningVisitor = toRef(guestDomain, 'isReturningVisitor');

function selectLanguage(selected: Locale) {
	translations.setLanguage(selected as Language);
	guestDomain.markAsReturningVisitor();
}

let nowTimer: ReturnType<typeof setInterval> | undefined;

const isStatusLoading = ref(true);
const guestIdentity = computed(() => guestDomain.identity);

/**
 * Whether `/api/market` has ever returned usable data. Stays `false` while it hasn't, including
 * when the optional configuration endpoint can't be reached — `phase` below treats that the same
 * as registration being open, so the form is still available rather than blocking a guest behind
 * a "not open" screen the app can't actually confirm.
 */
const hasLoadedRegistration = computed(() => session.currentState !== null);
/** Ticks every second so the registration form's countdown stays live. */
const now = ref(Date.now());

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
		hasActiveVisit: visitStore.hasActiveVisit,
	}),
);
/** Once a market has run its course, there is nothing left to preregister for until an admin
 *  schedules the next one — unlike the "hasn't opened yet" case, which still welcomes it. */
const canPreregister = computed(() => session.currentStatus !== SessionStatusEnum.ENDED);
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

	visitStore.submit(result.registration);
}

function cancelVisit() {
	if (!window.confirm(t.value.cancelVisitConfirm)) {
		return;
	}

	void visitStore.cancel();
}

onMounted(async () => {
	nowTimer = setInterval(() => {
		now.value = Date.now();
	}, 1_000);
	await Promise.all([session.getStatus().catch(() => undefined), visitStore.refresh()]);
	isStatusLoading.value = false;
});
onBeforeUnmount(() => {
	clearInterval(nowTimer);
});
</script>

<template>
	<section class="guest-layout">
		<!-- Card that indicates who the guest has been identified as -->
		<GuestIdentityIndicator v-if="guestIdentity" :identity="guestIdentity" />

		<GuestLanguageHero
			v-if="!isReturningVisitor"
			:t="t"
			:locale="locale"
			@select-language="selectLanguage"
		/>

		<p v-if="isStatusLoading" class="status-loading" aria-live="polite">{{ t.statusLoading }}</p>
		<template v-else>
			<Card aria-live="polite">
				<template v-if="!session.isActive">
					<GuestNotOpenState :t="t" :allow-preregister="canPreregister" @preregister="goToSignup" />
				</template>
				<template v-else>
					<GuestVisitStatus
						v-if="cardState.kind === 'visit-status'"
						:success-title="successCopy.title"
						:success-description="successCopy.description"
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
				</template>
			</Card>
		</template>
	</section>
</template>
