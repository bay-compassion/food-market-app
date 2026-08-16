<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { auth0 } from './auth';
import { isAdminView, type AdminView } from './components/admin/types';
import AdminAuthView from './components/AdminAuthView.vue';
import EyebrowLabel from './components/EyebrowLabel.vue';
import GuestSignupCard from './components/GuestSignupCard.vue';
import LegalDocumentView from './components/legal/LegalDocumentView.vue';
import privacyMarkdown from './components/legal/privacy.md?raw';
import termsMarkdown from './components/legal/terms.md?raw';
import QrCodeView from './components/QrCodeView.vue';
import type { GuestFormState } from './components/types';
import { languages, translations, type Locale } from './locales';
import {
	automaticSessionStatus,
	type SessionMode,
	type SessionStatus,
} from './services/sessionStateMachine';
import type { VisitStatus } from './services/visitStateMachine';
import { guestVisitStatusLabel } from './services/visitStatusLabels';

const localeStorageKey = 'bay-compassion.locale';
const returningVisitorStorageKey = 'bay-compassion.returning-visitor';
const visitTokenStorageKey = 'bay-compassion.visit-token';
let registrationRefreshTimer: ReturnType<typeof setTimeout> | undefined;
let visitRefreshTimer: ReturnType<typeof setTimeout> | undefined;

function getSavedLocale(): Locale {
	const savedLocale = window.localStorage.getItem(localeStorageKey);

	return languages.some((language) => language.code === savedLocale)
		? (savedLocale as Locale)
		: 'en';
}

const locale = ref<Locale>(getSavedLocale());
const isReturningVisitor = ref(window.localStorage.getItem(returningVisitorStorageKey) === 'true');
const isSubmitted = ref(false);
const isSubmitting = ref(false);
const isCancelling = ref(false);
const submissionError = ref('');
const registrationType = ref<'new' | 'returning'>('new');
const pin = ref('');
const pinConfirmation = ref('');
const updateProfile = ref(false);
type ActiveVisit = {
	id: string;
	status: VisitStatus;
	queuePosition: number | null;
	aheadOfYou: number | null;
};
const activeVisit = ref<ActiveVisit | null>(null);
const isStatusLoading = ref(true);
const visitToken = ref<string | null>(window.localStorage.getItem(visitTokenStorageKey));
type MarketEventTiming = {
	id: string;
	status: SessionStatus;
	sessionMode: SessionMode;
	registrationOpensAt: Date;
	registrationClosesAt: Date;
};
const marketEvent = ref<MarketEventTiming | null>(null);
const registrationAvailable = ref(true);
const registrationQuestions = ref<
	{ id: string; prompt: string; type: 'text' | 'scale'; required: boolean }[]
>([]);
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

const t = computed(() => translations[locale.value]);
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
const authenticationError = computed(() => auth0?.error.value ?? null);
const route = useRoute();
const router = useRouter();
const isAdmin = computed(() => route.name === 'admin');
const isPrivacy = computed(() => route.name === 'privacy');
const isTerms = computed(() => route.name === 'terms');
const isQrCode = computed(() => route.name === 'qr-code');
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
const adminView = computed<AdminView>(() =>
	isAdminView(route.params.view) ? route.params.view : 'current-session',
);

function showGuest() {
	isSubmitted.value = false;
	void router.push({ name: 'guest' });
}

function toggleMode() {
	void router.push({ name: isAdmin.value ? 'guest' : 'admin' });
}

function showPrivacy() {
	void router.push({ name: 'privacy' });
}

function showTerms() {
	void router.push({ name: 'terms' });
}

function goToSignup() {
	void router.push({ name: 'signup' });
}

function navigateAdmin(view: AdminView) {
	void router.push({ name: 'admin', params: { view } });
}

function selectLanguage(selectedLocale: Locale) {
	locale.value = selectedLocale;
	isReturningVisitor.value = true;
	window.localStorage.setItem(localeStorageKey, selectedLocale);
	window.localStorage.setItem(returningVisitorStorageKey, 'true');
}

function saveLocale() {
	window.localStorage.setItem(localeStorageKey, locale.value);
}

async function submitForm() {
	isSubmitting.value = true;
	submissionError.value = '';

	try {
		if (registrationType.value === 'new' && pin.value !== pinConfirmation.value) {
			submissionError.value = t.value.pinMismatch;

			return;
		}
		const response = await fetch('/api/guests', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				...guest.value,
				locale: locale.value,
				marketEventId: marketEvent.value?.id ?? null,
				answers: registrationAnswers.value,
				source: 'self',
				registrationType: registrationType.value,
				pin: pin.value,
				updateProfile: registrationType.value === 'returning' && updateProfile.value,
			}),
		});

		if (!response.ok) {
			throw new Error('Guest submission failed');
		}
		const registration = (await response.json()) as {
			id: string;
			status: VisitStatus;
			visitToken: string;
		};
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
		submissionError.value = t.value.submissionError;
	} finally {
		isSubmitting.value = false;
	}
}

async function loadActiveVisit() {
	const token = window.localStorage.getItem(visitTokenStorageKey);
	if (!token) {
		return;
	}
	try {
		const response = await fetch('/api/visit', {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!response.ok) {
			window.localStorage.removeItem(visitTokenStorageKey);
			visitToken.value = null;
			activeVisit.value = null;
			isSubmitted.value = false;
			scheduleVisitRefresh();

			return;
		}
		activeVisit.value = (await response.json()) as ActiveVisit;
		isSubmitted.value = true;
		scheduleVisitRefresh();
	} catch {
		// Keep registration available if status refresh is temporarily unavailable.
	}
}

async function cancelVisit() {
	const token = window.localStorage.getItem(visitTokenStorageKey);
	if (!token || !window.confirm(t.value.cancelVisitConfirm)) {
		return;
	}

	isCancelling.value = true;
	try {
		const response = await fetch('/api/visit', {
			method: 'PATCH',
			headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'cancel' }),
		});
		if (!response.ok) {
			throw new Error('cancel');
		}

		const visit = (await response.json()) as { id: string; status: VisitStatus };
		activeVisit.value = { ...activeVisit.value!, ...visit };
	} catch {
		submissionError.value = t.value.visitError;
	} finally {
		isCancelling.value = false;
	}
}

async function loadRegistration() {
	try {
		const response = await fetch('/api/market');
		if (!response.ok) {
			return;
		}
		const data = (await response.json()) as {
			event: {
				id: string;
				status: SessionStatus;
				sessionMode: SessionMode;
				registrationOpensAt: string;
				registrationClosesAt: string;
			} | null;
			questions: { id: string; prompt: string; type: 'text' | 'scale'; required: boolean }[];
		};
		marketEvent.value = data.event
			? {
					id: data.event.id,
					status: data.event.status,
					sessionMode: data.event.sessionMode,
					registrationOpensAt: new Date(data.event.registrationOpensAt),
					registrationClosesAt: new Date(data.event.registrationClosesAt),
				}
			: null;
		registrationQuestions.value = data.questions;
		const now = new Date();
		registrationAvailable.value = Boolean(
			data.event &&
			data.event.status === 'registration_open' &&
			now >= new Date(data.event.registrationOpensAt) &&
			now <= new Date(data.event.registrationClosesAt),
		);
		if (registrationRefreshTimer) {
			clearTimeout(registrationRefreshTimer);
		}
		const nextTransitionAt =
			data.event?.status === 'scheduled'
				? new Date(data.event.registrationOpensAt)
				: data.event?.status === 'registration_open'
					? new Date(data.event.registrationClosesAt)
					: null;
		if (nextTransitionAt && nextTransitionAt > now) {
			registrationRefreshTimer = setTimeout(
				loadRegistration,
				Math.min(nextTransitionAt.valueOf() - now.valueOf() + 250, 2_147_000_000),
			);
		}
	} catch {
		// Keep the form available when the optional configuration endpoint cannot be reached.
	}
}

onMounted(async () => {
	await Promise.all([loadRegistration(), loadActiveVisit()]);
	isStatusLoading.value = false;
});
onBeforeUnmount(() => {
	clearTimeout(registrationRefreshTimer);
	clearTimeout(visitRefreshTimer);
});
</script>

<template>
	<main
		class="app-shell"
		:class="{ 'app-shell--print-qr': isQrCode }"
		:dir="locale === 'fa' || locale === 'ar' ? 'rtl' : 'ltr'"
	>
		<header class="topbar">
			<a class="brand" href="/" @click.prevent="showGuest">
				<img class="brand-mark" src="/bay-compassion-logo.png" alt="" />
				<span>{{ t.marketName }}</span>
			</a>
			<div class="header-actions">
				<label v-if="isReturningVisitor" class="language-picker">
					<span class="sr-only">{{ t.language }}</span>
					<select v-model="locale" :aria-label="t.language" @change="saveLocale">
						<option v-for="language in languages" :key="language.code" :value="language.code">
							{{ language.label }}
						</option>
					</select>
				</label>
				<button class="mode-button" type="button" @click="toggleMode">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
					>
						<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0" />
					</svg>
					{{ isAdmin ? t.guest : t.admin }}
				</button>
			</div>
		</header>
		<p v-if="authenticationError" class="auth-banner" role="alert">{{ t.authError }}</p>

		<LegalDocumentView
			v-if="isPrivacy"
			:back-label="t.backToGuest"
			:markdown="privacyMarkdown"
			@back="showGuest"
		/>
		<LegalDocumentView
			v-else-if="isTerms"
			:back-label="t.backToGuest"
			:markdown="termsMarkdown"
			@back="showGuest"
		/>
		<QrCodeView
			v-else-if="isQrCode"
			:back-label="t.backToGuest"
			:title="t.qrCodeTitle"
			:description="t.qrCodeDescription"
			:image-alt="t.qrCodeImageAlt"
			:print-label="t.qrCodePrint"
			@back="showGuest"
		/>
		<section v-else-if="!isAdmin" class="guest-layout">
			<p v-if="isStatusLoading" class="status-loading" aria-live="polite">{{ t.statusLoading }}</p>
			<template v-else>
				<div v-if="!isReturningVisitor" class="hero">
					<EyebrowLabel>{{ t.compassionFood }}</EyebrowLabel>
					<h1>{{ t.welcome }}</h1>
					<p class="hero-copy">{{ t.heroCopy }}</p>
					<section class="language-selector" :aria-label="t.language">
						<p>{{ t.languagePrompt }}</p>
						<div class="language-list" role="group" :aria-label="t.languagePrompt">
							<button
								v-for="language in languages"
								:key="language.code"
								class="language-option"
								:class="{ active: locale === language.code }"
								type="button"
								:aria-pressed="locale === language.code"
								@click="selectLanguage(language.code)"
							>
								{{ language.label }}
							</button>
						</div>
					</section>
				</div>

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
					@submit="submitForm"
					@cancel-visit="cancelVisit"
					@preregister="goToSignup"
				/>
			</template>
		</section>

		<AdminAuthView v-else :locale="locale" :view="adminView" @navigate="navigateAdmin" />

		<footer v-if="!isPrivacy && !isTerms && !isQrCode" class="app-footer">
			<a href="/privacy" @click.prevent="showPrivacy">{{ t.privacyPolicy }}</a>
			<span class="app-footer-divider" aria-hidden="true">·</span>
			<a href="/terms" @click.prevent="showTerms">{{ t.termsAndConditions }}</a>
		</footer>
	</main>
</template>
