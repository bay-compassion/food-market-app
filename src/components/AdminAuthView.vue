<script setup lang="ts">
import { useAuth0 } from '@auth0/auth0-vue';
import { computed } from 'vue';

import { authReturnUrl, isAuth0Configured } from '../auth';
import { translations, type Locale } from '../locales';
import AdminDashboard from './AdminDashboard.vue';

const props = defineProps<{ locale: Locale }>();
const t = computed(() => translations[props.locale]);
const auth = isAuth0Configured ? useAuth0() : null;

function signOut() {
	void auth?.logout({ logoutParams: { returnTo: authReturnUrl } });
}
</script>

<template>
	<section v-if="!isAuth0Configured" class="auth-message" role="alert">
		<h1>{{ t.authConfigurationRequired }}</h1>
		<p>{{ t.authConfigurationDescription }}</p>
	</section>
	<section v-else-if="auth?.isLoading.value" class="auth-message" aria-live="polite">
		<p>{{ t.authLoading }}</p>
	</section>
	<template v-else-if="auth?.isAuthenticated.value">
		<div class="admin-account">
			<span>{{ t.signedInAs }} {{ auth.user.value?.email ?? auth.user.value?.name }}</span>
			<button type="button" @click="signOut">{{ t.signOut }}</button>
		</div>
		<AdminDashboard :locale="locale" :get-access-token="auth.getAccessTokenSilently" />
	</template>
	<section v-else class="auth-message" role="alert">
		<p>{{ t.authError }}</p>
	</section>
</template>

<style scoped>
.auth-message {
	width: min(100% - 36px, 560px);
	margin: 0 auto;
	padding: 48px 0;
}
.auth-message h1 {
	color: var(--color-brand);
}
.auth-message p {
	color: var(--color-text-subtle);
	font-size: 17px;
	line-height: 1.6;
}
.admin-account {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 12px;
	width: min(100% - 32px, 760px);
	margin: 20px auto 0;
	font-size: 13px;
	color: var(--color-text-subtle);
}
.admin-account span {
	overflow: hidden;
	text-overflow: ellipsis;
}
.admin-account button {
	flex: 0 0 auto;
	padding: 9px 13px;
	border: 1.5px solid var(--color-brand);
	border-radius: var(--radius-pill);
	color: var(--color-brand);
	background: transparent;
	font-weight: 700;
}
</style>
