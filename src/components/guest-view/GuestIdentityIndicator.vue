<script setup lang="ts">
import type { Translation } from '../../locales';
import type { GuestIdentity } from '../../services/guest.store';

const props = defineProps<{
	t: Translation;
	identity: GuestIdentity;
}>();

const lastInitial = props.identity.lastName.charAt(0);
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
		</div>
	</aside>
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
		grid-template-rows: 2fr;
		grid-template-columns: repeat(2, 1fr);
		grid-template-areas:
			'heading heading'
			'name phone';
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
</style>
