<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import { translations, type Locale } from '../../locales';
import AppButton from '../AppButton.vue';

const props = defineProps<{ visitToken: string | null; locale: Locale }>();

const t = computed(() => translations[props.locale]);

const isIos = /iPad|iPhone|iPod/.test(window.navigator.userAgent);
const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches === true;
const browserSupportsPush =
	'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// Push notifications
const pushPublicKey = ref<string | null>(null);
const pushConfigured = ref(false);
const notificationState = ref<'idle' | 'enabling' | 'enabled' | 'error'>('idle');
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
		if (browserSupportsPush && Notification.permission === 'granted' && props.visitToken) {
			await syncExistingPushSubscription(props.visitToken);
		}
	} catch {
		// Notification opt-in remains hidden if configuration is unavailable.
	}
}

async function enableNotifications() {
	if (!props.visitToken || !pushPublicKey.value || !canEnableNotifications.value) {
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
		await savePushSubscription(subscription, props.visitToken);
	} catch {
		notificationState.value = 'error';
	}
}

// SMS notifications
const smsConfigured = ref(false);
const smsConsent = ref(false);
const smsState = ref<'idle' | 'enabling' | 'enabled' | 'error'>('idle');
const canEnableSms = computed(() => smsConfigured.value && Boolean(props.visitToken));

async function loadSmsConfiguration() {
	try {
		const response = await fetch('/api/sms-subscription', {
			headers: props.visitToken ? { Authorization: `Bearer ${props.visitToken}` } : undefined,
		});
		if (!response.ok) {
			return;
		}
		const configuration = (await response.json()) as { configured: boolean; subscribed: boolean };
		smsConfigured.value = configuration.configured;
		// Consent is a guest characteristic, not a per-visit one — a guest who already consented on
		// a past visit shouldn't see the checkbox again. A `false` here isn't necessarily "not
		// subscribed" though (it's also the response shape before a token is known), so it never
		// overrides a state `enableSms` already set locally.
		if (configuration.subscribed) {
			smsState.value = 'enabled';
		}
	} catch {
		// SMS opt-in remains hidden if configuration is unavailable.
	}
}

async function enableSms() {
	if (!props.visitToken || !canEnableSms.value || !smsConsent.value) {
		return;
	}
	smsState.value = 'enabling';
	try {
		const response = await fetch('/api/sms-subscription', {
			method: 'POST',
			headers: { Authorization: `Bearer ${props.visitToken}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({ consent: true }),
		});
		if (!response.ok) {
			throw new Error('subscription');
		}
		smsState.value = 'enabled';
	} catch {
		smsState.value = 'error';
	}
}

// A guest may finish registering, or return with a saved token, after this component has already
// mounted — re-sync the push subscription and re-check SMS consent whenever the token changes,
// since this component is no longer scoped to a single visit's status screen.
watch(
	() => props.visitToken,
	async (token) => {
		if (!token) {
			return;
		}
		try {
			await syncExistingPushSubscription(token);
		} catch {
			notificationState.value = 'error';
		}
		void loadSmsConfiguration();
	},
);

onMounted(() => {
	void loadPushConfiguration();
	void loadSmsConfiguration();
});
</script>

<template>
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
	<div v-if="smsConfigured" class="notification-option">
		<p v-if="smsState === 'enabled'" class="notification-enabled">{{ t.smsEnabled }}</p>
		<template v-else>
			<AppButton
				type="button"
				variant="secondary"
				:disabled="!smsConsent || smsState === 'enabling'"
				@click="enableSms"
			>
				{{ t.smsEnable }}
			</AppButton>
			<label class="update-profile-option sms-consent">
				<input v-model="smsConsent" type="checkbox" />
				<span>
					{{ t.smsConsentLabel }}
					<a href="/privacy">{{ t.privacyPolicy }}</a>
					·
					<a href="/terms">{{ t.termsAndConditions }}</a>
				</span>
			</label>
			<p v-if="smsState === 'error'" class="submission-error" role="alert">
				{{ t.smsError }}
			</p>
		</template>
	</div>
</template>

<style scoped>
/**
 * The consent paragraph is long enough that the bold weight `.update-profile-option` normally
 * uses for its short, one-line siblings (see `guest.css`) reads as a dense, hard-to-scan block
 * here — normal weight with more line-height keeps it legible without shrinking it into fine
 * print, since this text still has to double as the guest's affirmative action.
 */
.sms-consent span {
	font-weight: 400;
	line-height: 1.55;
}
</style>
