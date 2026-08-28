<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AppBar from '@/components/ui/app-bar/AppBar.vue';
import { useTranslation } from '@/stores/hooks/use-translation.ts';
import { useStore } from '@/stores/use-store.ts';

import { auth0 } from './auth';
import { isAdminView, type AdminView } from './components/admin/types';
import AdminAuthView from './components/AdminAuthView.vue';
import AppFooter from './components/AppFooter.vue';

const { translations } = useStore();
const t = useTranslation();

const authenticationError = computed(() => auth0?.error.value ?? null);
const route = useRoute();
const router = useRouter();
const isAdmin = computed(() => route.name === 'admin');
const isQrCode = computed(() => route.name === 'qr-code');
const adminView = computed<AdminView>(() =>
	isAdminView(route.params.view) ? route.params.view : 'current-session',
);

function showGuest() {
	void router.push({ name: 'guest' });
}
</script>

<template>
	<main class="app-shell" :class="{ 'app-shell--print-qr': isQrCode }" :dir="translations.dir">
		<AppBar />
		<p v-if="authenticationError" class="auth-banner" role="alert">
			{{ t.authError }}
		</p>
		<router-view />

		<!--		<AdminAuthView-->
		<!--			v-else-->
		<!--			:locale="translations.locale"-->
		<!--			:view="adminView"-->
		<!--			@navigate="navigateAdmin"-->
		<!--		/>-->

		<AppFooter :t="t" @back="showGuest" />
	</main>
</template>
