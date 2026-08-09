<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { auth0 } from './auth';
import { isAdminView, type AdminView } from './components/admin/types';
import AdminAuthView from './components/AdminAuthView.vue';
import AppButton from './components/AppButton.vue';
import EyebrowLabel from './components/EyebrowLabel.vue';
import FormField from './components/FormField.vue';
import { languages, translations, type Locale } from './locales';
import type { SessionStatus } from './services/sessionStateMachine';
import type { VisitStatus } from './services/visitStateMachine';

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
const pushPublicKey = ref<string | null>(null);
const pushConfigured = ref(false);
const notificationState = ref<'idle' | 'enabling' | 'enabled' | 'error'>('idle');
const currentMarketEventId = ref<string | null>(null);
const registrationAvailable = ref(true);
const registrationQuestions = ref<
	{ id: string; prompt: string; type: 'text' | 'scale'; required: boolean }[]
>([]);
const registrationAnswers = ref<Record<string, string | number>>({});
const guest = ref<{
	firstName: string;
	lastName: string;
	age: number | string;
	householdSize: number | string;
	phone: string;
}>({
	firstName: '',
	lastName: '',
	age: '',
	householdSize: '',
	phone: '',
});

const t = computed(() => translations[locale.value]);
const visitStatusLabel = computed(() => {
	if (!activeVisit.value) {
		return '';
	}

	return {
		registered: t.value.statusRegistered,
		waiting: t.value.statusWaiting,
		called: t.value.statusCalled,
		served: t.value.statusServed,
		not_placed: t.value.statusNotPlaced,
		no_show: t.value.statusNoShow,
		cancelled: t.value.statusCancelled,
	}[activeVisit.value.status];
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
const isIos = /iPad|iPhone|iPod/.test(window.navigator.userAgent);
const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches === true;
const browserSupportsPush =
	'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const notificationsDenied = computed(
	() => browserSupportsPush && Notification.permission === 'denied',
);
const canEnableNotifications = computed(
	() =>
		pushConfigured.value &&
		browserSupportsPush &&
		!notificationsDenied.value &&
		(!isIos || isStandalone),
);

function applicationServerKey(value: string) {
	const padding = '='.repeat((4 - (value.length % 4)) % 4);
	const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
	const bytes = window.atob(base64);

	return Uint8Array.from(bytes, (character) => character.charCodeAt(0));
}

async function savePushSubscription(subscription: PushSubscription, token: string) {
	const response = await fetch('/api/push-subscription', {
		method: 'POST',
		headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
		body: JSON.stringify(subscription.toJSON()),
	});
	if (!response.ok) {
		throw new Error('subscription');
	}
	notificationState.value = 'enabled';
}

async function syncExistingPushSubscription(token: string) {
	if (!browserSupportsPush || Notification.permission !== 'granted') {
		return;
	}
	const registration = await navigator.serviceWorker.getRegistration('/');
	const subscription = await registration?.pushManager.getSubscription();
	if (subscription) {
		await savePushSubscription(subscription, token);
	}
}

async function loadPushConfiguration() {
	try {
		const response = await fetch('/api/push-subscription');
		if (!response.ok) {
			return;
		}
		const configuration = (await response.json()) as {
			configured: boolean;
			publicKey: string | null;
		};
		pushConfigured.value = configuration.configured;
		pushPublicKey.value = configuration.publicKey;
		if (browserSupportsPush && Notification.permission === 'granted') {
			const token = window.localStorage.getItem(visitTokenStorageKey);
			if (token) {
				await syncExistingPushSubscription(token);
			}
		}
	} catch {
		// Notification opt-in remains hidden if configuration is unavailable.
	}
}

async function enableNotifications() {
	const token = window.localStorage.getItem(visitTokenStorageKey);
	if (!token || !pushPublicKey.value || !canEnableNotifications.value) {
		return;
	}
	notificationState.value = 'enabling';
	try {
		const registration = await navigator.serviceWorker.register('/service-worker.js');
		const permission = await Notification.requestPermission();
		if (permission !== 'granted') {
			throw new Error('permission');
		}
		const subscription =
			(await registration.pushManager.getSubscription()) ??
			(await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: applicationServerKey(pushPublicKey.value),
			}));
		await savePushSubscription(subscription, token);
	} catch {
		notificationState.value = 'error';
	}
}

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
				marketEventId: currentMarketEventId.value,
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
		activeVisit.value = {
			id: registration.id,
			status: registration.status,
			queuePosition: null,
			aheadOfYou: null,
		};
		isSubmitted.value = true;
		void syncExistingPushSubscription(registration.visitToken).catch(() => {
			notificationState.value = 'error';
		});
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
				registrationOpensAt: string;
				registrationClosesAt: string;
			} | null;
			questions: { id: string; prompt: string; type: 'text' | 'scale'; required: boolean }[];
		};
		currentMarketEventId.value = data.event?.id ?? null;
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

onMounted(() => Promise.all([loadRegistration(), loadActiveVisit(), loadPushConfiguration()]));
onBeforeUnmount(() => {
	clearTimeout(registrationRefreshTimer);
	clearTimeout(visitRefreshTimer);
});
</script>

<template>
	<main class="app-shell" :dir="locale === 'fa' || locale === 'ar' ? 'rtl' : 'ltr'">
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

		<section v-if="!isAdmin" class="guest-layout">
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

			<section class="checkin-card" aria-live="polite">
				<div v-if="activeVisit && isSubmitted" class="success-state">
					<template v-if="isCalled">
						<div class="checkmark called-mark" aria-hidden="true">→</div>
						<h2>{{ t.calledTitle }}</h2>
						<p>{{ t.calledDescription }}</p>
					</template>
					<template v-else>
						<div class="checkmark">✓</div>
						<h2>{{ t.successTitle }}</h2>
						<div v-if="queuePosition" class="queue-standing">
							<p class="queue-position">
								<span>{{ t.queuePositionLabel }}</span>
								<strong>{{ queuePosition }}</strong>
							</p>
							<p v-if="guestsAhead === 0" class="queue-next">{{ t.youAreNext }}</p>
							<p v-else-if="guestsAhead !== null">
								{{ t.guestsAheadOfYou }}: <strong>{{ guestsAhead }}</strong>
							</p>
						</div>
						<p v-else>
							{{ t.currentStatus }}: <strong>{{ visitStatusLabel }}</strong>
						</p>
						<p>{{ t.successDescription }}</p>
					</template>
					<div v-if="pushConfigured" class="notification-option">
						<p v-if="notificationState === 'enabled'" class="notification-enabled">
							{{ t.notificationsEnabled }}
						</p>
						<p v-else-if="notificationsDenied">{{ t.notificationsDenied }}</p>
						<template v-else-if="canEnableNotifications">
							<AppButton
								type="button"
								variant="secondary"
								:disabled="notificationState === 'enabling'"
								@click="enableNotifications"
							>
								{{ t.notificationsEnable }}
							</AppButton>
							<p v-if="notificationState === 'error'" class="submission-error" role="alert">
								{{ t.notificationsError }}
							</p>
						</template>
						<p v-else-if="isIos && !isStandalone">{{ t.notificationsIosInstall }}</p>
						<p v-else>{{ t.notificationsUnsupported }}</p>
					</div>
					<p v-if="submissionError" class="submission-error" role="alert">
						{{ submissionError }}
					</p>
					<AppButton
						v-if="canCancelVisit"
						type="button"
						variant="secondary"
						:disabled="isCancelling"
						@click="cancelVisit"
					>
						{{ t.cancelVisit }}
					</AppButton>
				</div>
				<div v-else-if="!registrationAvailable" class="closed-state">
					<div class="closed-icon" aria-hidden="true">—</div>
					<h2>{{ t.registrationClosed }}</h2>
					<p>{{ t.registrationClosedDescription }}</p>
				</div>
				<form v-else-if="registrationAvailable" @submit.prevent="submitForm">
					<div class="form-heading">
						<h2>{{ t.formTitle }}</h2>
						<p>{{ t.formDescription }}</p>
					</div>
					<div class="registration-type" role="group" :aria-label="t.registrationType">
						<button
							type="button"
							:class="{ active: registrationType === 'new' }"
							:aria-pressed="registrationType === 'new'"
							@click="registrationType = 'new'"
						>
							{{ t.newGuest }}
						</button>
						<button
							type="button"
							:class="{ active: registrationType === 'returning' }"
							:aria-pressed="registrationType === 'returning'"
							@click="registrationType = 'returning'"
						>
							{{ t.returningGuest }}
						</button>
					</div>
					<p v-if="registrationType === 'returning'" class="form-help">
						{{ t.returningGuestHelp }}
					</p>
					<template v-if="registrationType === 'new' || updateProfile">
						<FormField
							v-model="guest.firstName"
							:label="t.firstName"
							required
							autocomplete="given-name"
						/>
						<FormField
							v-model="guest.lastName"
							:label="t.lastName"
							required
							autocomplete="family-name"
						/>
						<FormField
							v-model="guest.age"
							:label="t.age"
							type="number"
							required
							:min="0"
							:max="120"
							inputmode="numeric"
							:placeholder="t.ageHint"
						/>
						<FormField
							v-model="guest.householdSize"
							:label="t.household"
							type="number"
							required
							:min="1"
							:max="30"
							inputmode="numeric"
							:placeholder="t.householdHint"
						/>
					</template>
					<FormField
						v-model="guest.phone"
						:label="t.phone"
						required
						autocomplete="tel"
						inputmode="tel"
						type="tel"
						placeholder="(555) 123-4567"
					/>
					<FormField
						v-model="pin"
						:label="t.pin"
						type="password"
						required
						:minlength="4"
						:maxlength="8"
						inputmode="numeric"
						:placeholder="t.pinHint"
					/>
					<FormField
						v-if="registrationType === 'new'"
						v-model="pinConfirmation"
						:label="t.confirmPin"
						type="password"
						required
						:minlength="4"
						:maxlength="8"
						inputmode="numeric"
					/>
					<label v-if="registrationType === 'returning'" class="update-profile-option">
						<input v-model="updateProfile" type="checkbox" />
						<span>{{ t.updateInformation }}</span>
					</label>
					<label
						v-for="question in registrationQuestions"
						:key="question.id"
						class="dynamic-question"
					>
						<span>{{ question.prompt }}</span>
						<select
							v-if="question.type === 'scale'"
							v-model.number="registrationAnswers[question.id]"
							:required="question.required"
						>
							<option value="" disabled>{{ t.chooseAnswer }}</option>
							<option v-for="value in 10" :key="value" :value="value">{{ value }}</option>
						</select>
						<textarea
							v-else
							v-model.trim="registrationAnswers[question.id]"
							:required="question.required"
							rows="3"
						></textarea>
					</label>
					<p v-if="submissionError" class="submission-error" role="alert">
						{{ submissionError }}
					</p>
					<AppButton type="submit" :disabled="isSubmitting">
						{{ isSubmitting ? t.submitting : t.submit }} <span aria-hidden="true">→</span>
					</AppButton>
					<p class="privacy">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="5" y="10" width="14" height="10" rx="2" />
							<path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg
						>{{ t.privacy }}
					</p>
				</form>
			</section>
		</section>

		<AdminAuthView v-else :locale="locale" :view="adminView" @navigate="navigateAdmin" />
	</main>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@500;600;700&family=Roboto:wght@400;500;700&display=swap');

:root {
	--font-body: Roboto, Arial, sans-serif;
	--font-heading: 'Roboto Condensed', Impact, sans-serif;
	--color-brand: #023940;
	--color-brand-dark: #012a2f;
	--color-on-brand: #fff;
	--color-background: #fff;
	--color-surface-soft: #f1f5f3;
	--color-text: #101010;
	--color-text-muted: #3d453f;
	--color-text-subtle: #60746a;
	--color-border: #5c655f;
	--color-placeholder: #7c8880;
	--color-focus: #ffb545;
	--color-error: #a12622;
	--radius-sm: 8px;
	--radius-md: 16px;
	--radius-lg: 24px;
	--radius-pill: 999px;

	font-family: var(--font-body);
	color: var(--color-text);
	background: var(--color-background);
	font-synthesis: none;
}
* {
	box-sizing: border-box;
}
body {
	margin: 0;
}
button,
input,
select,
textarea {
	font: inherit;
}
button {
	cursor: pointer;
}
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
button:focus-visible,
a:focus-visible {
	outline: 3px solid var(--color-focus);
	outline-offset: 2px;
}
.app-shell {
	min-height: 100vh;
	background: var(--color-background);
}
.topbar {
	height: 60px;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 20px;
	background: var(--color-brand);
}
.auth-banner {
	padding: 12px 20px;
	color: white;
	background: var(--color-error);
	font-size: 14px;
	line-height: 1.4;
	text-align: center;
}
.brand {
	display: inline-flex;
	gap: 8px;
	align-items: center;
	color: var(--color-on-brand);
	font-family: var(--font-heading);
	font-weight: 700;
	font-size: 14.5px;
	text-transform: uppercase;
	text-decoration: none;
}
.brand-mark {
	width: 28px;
	height: 28px;
	object-fit: contain;
	border-radius: var(--radius-sm);
}
.header-actions {
	display: flex;
	gap: 10px;
	align-items: center;
}
.language-picker select {
	min-height: 46px;
	padding: 0 8px;
	border: 0;
	border-radius: var(--radius-sm);
	color: var(--color-on-brand);
	background: transparent;
	font-size: 15px;
	font-weight: 600;
}
.language-picker option {
	color: var(--color-brand);
	background: var(--color-background);
}
.mode-button {
	display: inline-flex;
	align-items: center;
	gap: 7px;
	min-height: 46px;
	padding: 0 15px;
	border: 1.5px solid var(--color-on-brand);
	border-radius: var(--radius-pill);
	color: var(--color-on-brand);
	background: transparent;
	font-family: var(--font-heading);
	font-weight: 600;
	font-size: 13px;
	text-transform: uppercase;
}
.mode-button svg {
	width: 16px;
}
.guest-layout {
	width: min(100% - 36px, 560px);
	margin: 0 auto;
	padding: 24px 0 40px;
}
.hero {
	margin-bottom: 24px;
	padding: 32px 22px;
	color: var(--color-on-brand);
	background: var(--color-brand);
	border-radius: var(--radius-lg);
}
h1,
h2,
p {
	margin: 0;
}
h1 {
	margin-bottom: 14px;
	font-family: var(--font-heading);
	font-size: 38px;
	font-weight: 700;
	line-height: 1.05;
	letter-spacing: -0.01em;
	text-transform: uppercase;
}
.hero-copy {
	margin-bottom: 28px;
	color: var(--color-on-brand);
	font-size: 17px;
	line-height: 1.65;
}
.language-selector {
	padding-top: 24px;
	border-top: 2px solid rgba(255, 255, 255, 0.4);
}
.language-selector > p {
	margin-bottom: 14px;
	font-family: var(--font-heading);
	font-size: 15px;
	font-weight: 700;
	letter-spacing: 0.04em;
	text-transform: uppercase;
}
.language-list {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 12px;
}
.language-option {
	min-height: 60px;
	padding: 8px;
	border: 2px solid var(--color-on-brand);
	border-radius: var(--radius-md);
	color: var(--color-on-brand);
	background: transparent;
	font-size: 15px;
	font-weight: 700;
	line-height: 1.15;
	transition:
		background 0.2s,
		color 0.2s;
}
.language-option:hover,
.language-option.active {
	color: var(--color-brand);
	background: var(--color-background);
}
.checkin-card {
	padding: 32px 22px;
	border: 2px solid var(--color-brand);
	border-radius: var(--radius-lg);
	background: var(--color-background);
}
.form-heading {
	margin-bottom: 8px;
}
.form-heading h2,
.success-state h2 {
	margin-bottom: 9px;
	font-family: var(--font-heading);
	font-size: 29px;
	letter-spacing: -0.01em;
	text-transform: uppercase;
	color: var(--color-text);
}
.form-heading p,
.success-state p {
	color: var(--color-text-muted);
	font-size: 16px;
	line-height: 1.55;
}
form {
	display: grid;
	gap: 18px;
}
.registration-type {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 8px;
}
.registration-type button {
	min-height: 48px;
	border: 2px solid var(--color-brand);
	border-radius: var(--radius-md);
	color: var(--color-brand);
	background: var(--color-background);
	font-weight: 700;
}
.registration-type button.active {
	color: var(--color-on-brand);
	background: var(--color-brand);
}
.form-help {
	margin: 0;
	color: var(--color-text-muted);
	font-size: 14px;
	line-height: 1.5;
}
.update-profile-option {
	display: flex;
	align-items: center;
	gap: 10px;
	font-weight: 600;
}
.update-profile-option input {
	width: 20px;
	height: 20px;
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
.success-state {
	display: grid;
	min-height: 340px;
	place-content: center;
	text-align: center;
}
.closed-state {
	display: grid;
	min-height: 280px;
	place-content: center;
	text-align: center;
}
.closed-state h2 {
	margin-bottom: 8px;
	font-family: var(--font-heading);
	font-size: 28px;
	text-transform: uppercase;
}
.closed-state p {
	max-width: 320px;
	color: var(--color-text-muted);
	line-height: 1.55;
}
.closed-icon {
	display: grid;
	width: 54px;
	height: 54px;
	place-self: center;
	place-items: center;
	margin-bottom: 16px;
	border-radius: 50%;
	color: white;
	background: var(--color-brand);
	font-size: 28px;
}
.dynamic-question {
	display: grid;
	gap: 8px;
	font-family: var(--font-heading);
	font-size: 14.5px;
	font-weight: 700;
}
.dynamic-question select,
.dynamic-question textarea {
	width: 100%;
	padding: 14px 16px;
	border: 2px solid var(--color-border);
	border-radius: var(--radius-md);
	color: var(--color-text);
	background: var(--color-background);
	font-family: var(--font-body);
}
.checkmark {
	display: grid;
	width: 58px;
	height: 58px;
	place-self: center;
	place-items: center;
	margin-bottom: 19px;
	border-radius: var(--radius-md);
	color: var(--color-on-brand);
	background: var(--color-brand);
	font-size: 29px;
}
.success-state p {
	max-width: 280px;
	margin: 0 auto 27px;
}
.called-mark {
	background: var(--color-error);
	font-size: 34px;
}
.queue-standing {
	margin-bottom: 27px;
	padding: 18px;
	border-radius: var(--radius-md);
	background: var(--color-surface-soft);
}
.queue-standing p {
	margin-bottom: 0;
}
.queue-position {
	display: grid;
	gap: 4px;
	margin-bottom: 8px;
}
.queue-position strong {
	font-family: var(--font-heading);
	font-size: 44px;
	line-height: 1;
	color: var(--color-brand);
}
.queue-next {
	font-weight: 700;
}
.notification-option {
	display: grid;
	gap: 12px;
	margin-bottom: 22px;
	padding: 18px;
	border-radius: var(--radius-md);
	background: var(--color-surface-soft);
}
.notification-option p {
	margin-bottom: 0;
	font-size: 14px;
}
.notification-enabled {
	font-weight: 700;
}
.admin-view {
	width: min(100% - 36px, 560px);
	margin: 0 auto;
	padding: 48px 0;
}
.admin-view h1 {
	max-width: 650px;
	color: var(--color-brand);
}
.admin-view > p:not(.eyebrow) {
	max-width: 430px;
	color: var(--color-text-subtle);
	font-size: 17px;
	line-height: 1.6;
}
.admin-preview {
	display: flex;
	gap: 12px;
	margin: 38px 0;
}
.admin-preview span {
	display: grid;
	width: 65px;
	height: 65px;
	place-items: center;
	border-radius: 50%;
	color: var(--color-on-brand);
	background: var(--color-brand);
	font-weight: 700;
}
.sr-only {
	position: absolute;
	width: 1px;
	height: 1px;
	padding: 0;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border: 0;
}
</style>
