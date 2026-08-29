<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import AppBar from '@/components/ui/app-bar/AppBar.vue';
import { fromMobx } from '@/stores/hooks/from-mobx.ts';
import { useTranslation } from '@/stores/hooks/use-translation.ts';
import { useStore } from '@/stores/use-store.ts';

import { auth0 } from './auth';
import { isAdminView, type AdminView } from './components/admin/types';
import AdminAuthView from './components/AdminAuthView.vue';
import AppFooter from './components/AppFooter.vue';

const { translations } = useStore();
const t = useTranslation();
const dir = fromMobx(() => translations.dir);

const authenticationError = computed(() => auth0?.error.value ?? null);
const route = useRoute();
// The route is Vue-reactive, so these stay plain computeds; only `dir` comes from a store.
const isQrCode = computed(() => route.name === 'qr-code');
const adminView = computed<AdminView>(() =>
	isAdminView(route.params.view) ? route.params.view : 'current-session',
);
</script>

<template>
	<main class="app-shell" :class="{ 'app-shell--print-qr': isQrCode }" :dir="dir">
		<!-- `Observer` sits inside the root rather than around it. It renders no element of its
		     own, so as the outermost node it would leave `main` unreachable for attribute
		     inheritance — and a comment out here would make this component multi-root. -->
		<AppBar />
		<p v-if="authenticationError" class="auth-banner" role="alert">
			{{ t.authError }}
		</p>
		<router-view />

		<AppFooter :t="t" />
	</main>
</template>
