<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';

import type { GuestIdentity } from '@/services/guest.store.ts';
import { useRootStore } from '@/services/root.store.ts';
import { useTranslation } from '@/stores/hooks/use-translation.ts';

import AppButton from '../AppButton.vue';
import Dialog from '../ui/Dialog.vue';
import NotificationOptIn from './NotificationOptIn.vue';

const props = defineProps<{
	identity: GuestIdentity;
}>();

const guest = useRootStore().guest;
const t = useTranslation();
const notificationsDialogOpen = ref(false);
const lastInitial = props.identity.lastName.charAt(0);

onMounted(() => {
	void guest.loadNotificationSettings();
});

watch(
	() => guest.smsConsented,
	(consented) => {
		if (consented) {
			notificationsDialogOpen.value = false;
		}
	},
);
</script>

<template>
	<aside class="guest-identity" :aria-label="t.guestView.identityIndicator.heading">
		<div class="identity-row">
			<svg
				aria-hidden="true"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
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
			</div>
		</div>

		<div v-if="guest.notificationSettingsLoaded" class="notification-status">
			<p v-if="guest.smsConsented" class="notifications-enabled" aria-live="polite">
				<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor">
					<path d="m5 12 4 4L19 6" />
				</svg>
				{{ t.guestView.identityIndicator.notificationsEnabled }}
			</p>
			<AppButton
				v-else-if="guest.smsConfigured"
				type="button"
				variant="secondary"
				@click="notificationsDialogOpen = true"
			>
				{{ t.guestView.identityIndicator.notificationsAction }}
			</AppButton>
		</div>
	</aside>

	<Dialog
		:open="notificationsDialogOpen"
		:title="t.guestView.identityIndicator.notificationsDialogTitle"
		:close-label="t.guestView.identityIndicator.closeNotificationsDialog"
		@close="notificationsDialogOpen = false"
	>
		<NotificationOptIn :guest="guest" />
	</Dialog>
</template>

<style scoped>
.guest-identity {
	display: flex;
	flex-direction: column;
	margin-bottom: 16px;
	padding: 14px 16px;
	border-radius: var(--radius-md);
	color: var(--color-brand-dark);
	background: var(--color-surface-soft);

	& > .identity-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 12px;

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
