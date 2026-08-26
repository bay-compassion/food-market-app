<script setup lang="ts">
import { ref, watch } from 'vue';

import type { Locale, Translation } from '../../locales';
import type { GuestIdentity } from '../../services/guest.store';
import { useRootStore } from '../../services/root.store';
import AppButton from '../AppButton.vue';
import Dialog from '../ui/Dialog.vue';
import NotificationOptIn from './NotificationOptIn.vue';

const props = defineProps<{
	t: Translation;
	locale: Locale;
	identity: GuestIdentity;
	visitToken: string | null;
}>();

const guest = useRootStore().guest;
const notificationsDialogOpen = ref(false);
const lastInitial = props.identity.lastName.charAt(0);

watch(
	() => props.visitToken,
	(visitToken) => {
		if (visitToken) {
			void guest.loadNotificationSettings(visitToken);
		}
	},
	{ immediate: true },
);

watch(
	() => guest.notificationsEnabled,
	(enabled) => {
		if (enabled) {
			notificationsDialogOpen.value = false;
		}
	},
);
</script>

<template>
	<aside class="guest-identity" :aria-label="t.guestView.identityIndicator.heading">
		<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M20 21a8 8 0 0 0-16 0" />
			<circle cx="12" cy="7" r="4" />
			<path d="m16.5 14.5 1.5 1.5 3-3" />
		</svg>
		<div class="identity-container">
			<div class="identity-heading">{{ t.guestView.identityIndicator.heading }}</div>
			<div class="identity-name">
				<bdi dir="auto">{{ identity.firstName }} {{ lastInitial }}</bdi>
			</div>
			<div class="identity-phone">
				<bdi dir="ltr">{{ identity.phone }}</bdi>
			</div>
			<div v-if="guest.notificationSettingsLoaded" class="notification-status">
				<p v-if="guest.notificationsEnabled" class="notifications-enabled" aria-live="polite">
					<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<path d="m5 12 4 4L19 6" />
					</svg>
					{{ t.guestView.identityIndicator.notificationsEnabled }}
				</p>
				<AppButton
					v-else-if="guest.notificationsAvailable"
					type="button"
					variant="secondary"
					@click="notificationsDialogOpen = true"
				>
					{{ t.guestView.identityIndicator.notificationsAction }}
				</AppButton>
			</div>
		</div>
	</aside>

	<Dialog
		:open="notificationsDialogOpen"
		:title="t.guestView.identityIndicator.notificationsDialogTitle"
		:close-label="t.guestView.identityIndicator.closeNotificationsDialog"
		@close="notificationsDialogOpen = false"
	>
		<NotificationOptIn
			v-if="visitToken"
			:guest="guest"
			:visit-token="visitToken"
			:locale="locale"
		/>
	</Dialog>
</template>

<style scoped>
.guest-identity {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 16px;
	padding: 14px 16px;
	border-radius: var(--radius-md);
	color: var(--color-brand-dark);
	background: var(--color-surface-soft);

	svg {
		flex: 0 0 auto;
		width: 28px;
		height: 28px;
		color: var(--color-success);
	}

	.identity-container {
		display: grid;
		flex: 1;
		grid-template-columns: repeat(2, 1fr);
		grid-template-areas:
			'heading heading'
			'name phone'
			'notifications notifications';
	}

	.identity-heading {
		grid-area: heading;
	}

	.identity-name {
		grid-area: name;
	}

	.identity-phone {
		grid-area: phone;
	}

	.notification-status {
		grid-area: notifications;
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px solid rgb(2 57 64 / 18%);
	}

	.notification-status .app-button {
		width: 100%;
	}
}

.identity-heading {
	margin-bottom: 2px;
	color: var(--color-text-muted);
	font-size: 13px;
	font-weight: 600;
}
.identity-name {
	font-weight: 700;
}
.identity-phone {
	margin-top: 2px;
	color: var(--color-text-muted);
	font-size: 14px;
}

.notifications-enabled {
	display: flex;
	align-items: center;
	gap: 7px;
	margin: 0;
	color: var(--color-success);
	font-size: 13px;
	font-weight: 700;
}

.notifications-enabled svg {
	width: 18px;
	height: 18px;
	stroke-width: 2.5;
}
</style>
