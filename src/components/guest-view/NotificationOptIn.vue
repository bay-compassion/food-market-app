<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { translations, type Locale } from '../../locales';
import type { GuestStore } from '../../services/guest.store';
import AppButton from '../AppButton.vue';

const props = defineProps<{ guest: GuestStore; locale: Locale }>();
const guest = props.guest;
const t = computed(() => translations[props.locale]);
const smsConsent = ref(false);

onMounted(() => {
	void guest.loadNotificationSettings();
});
</script>

<template>
	<div class="notification-consent">
		<div v-if="guest.smsConfigured" class="notification-option">
			<p v-if="guest.smsState === 'enabled'" class="notification-enabled">{{ t.smsEnabled }}</p>
			<template v-else>
				<label class="sms-consent">
					<input v-model="smsConsent" type="checkbox" />
					<span>
						{{ t.smsConsentLabel }}
						<a href="/privacy">{{ t.privacyPolicy }}</a>
						·
						<a href="/terms">{{ t.termsAndConditions }}</a>
					</span>
				</label>
				<AppButton
					type="button"
					variant="secondary"
					:disabled="!smsConsent || guest.smsState === 'enabling'"
					@click="guest.enableSmsNotifications(smsConsent)"
				>
					{{ t.smsEnable }}
				</AppButton>
				<p v-if="guest.smsState === 'error'" class="submission-error" role="alert">
					{{ t.smsError }}
				</p>
			</template>
		</div>
	</div>
</template>

<style scoped>
.notification-consent {
	display: grid;
	gap: 18px;
}

.notification-option {
	display: grid;
	gap: 12px;
	padding: 18px;
	border-radius: var(--radius-md);
	background: var(--color-surface-soft);
}

.notification-option p {
	margin: 0;
	font-size: 14px;
}

.notification-enabled {
	font-weight: 700;
}

.sms-consent {
	display: flex;
	align-items: flex-start;
	gap: 10px;
}

.sms-consent input {
	flex: 0 0 auto;
	width: 20px;
	height: 20px;
	margin-top: 2px;
}

.sms-consent span {
	font-weight: 400;
	line-height: 1.55;
}

.submission-error {
	color: var(--color-error);
	font-size: 13px;
	line-height: 1.4;
}
</style>
