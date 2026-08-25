<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { auth0 } from './auth';
import { isAdminView, type AdminView } from './components/admin/types';
import AdminAuthView from './components/AdminAuthView.vue';
import AppFooter from './components/AppFooter.vue';
import GuestView from './components/guest-view/GuestView.vue';
import QrCodeView from './components/QrCodeView.vue';
import { languages, translations, type Locale } from './locales';

const localeStorageKey = 'bay-compassion.locale';
const returningVisitorStorageKey = 'bay-compassion.returning-visitor';

function getSavedLocale(): Locale {
	const savedLocale = window.localStorage.getItem(localeStorageKey);

	return languages.some((language) => language.code === savedLocale)
		? (savedLocale as Locale)
		: 'en';
}

const locale = ref<Locale>(getSavedLocale());
const isReturningVisitor = ref(window.localStorage.getItem(returningVisitorStorageKey) === 'true');
const guestView = ref<InstanceType<typeof GuestView> | null>(null);

const t = computed(() => translations[locale.value]);
const authenticationError = computed(() => auth0?.error.value ?? null);
const route = useRoute();
const router = useRouter();
const isAdmin = computed(() => route.name === 'admin');
const isPrivacy = computed(() => route.name === 'privacy');
const isTerms = computed(() => route.name === 'terms');
const isQrCode = computed(() => route.name === 'qr-code');
const adminView = computed<AdminView>(() =>
	isAdminView(route.params.view) ? route.params.view : 'current-session',
);

function showGuest() {
	guestView.value?.resetToForm();
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
		<QrCodeView
			v-if="isQrCode"
			:back-label="t.backToGuest"
			:title="t.qrCodeTitle"
			:description="t.qrCodeDescription"
			:image-alt="t.qrCodeImageAlt"
			:print-label="t.qrCodePrint"
			@back="showGuest"
		/>
		<!--
			v-show, not folded into the v-if above: AppFooter's LegalDocumentView covers the whole
			page over GuestView, and unmounting GuestView while it's hidden would drop in-progress
			form input and restart the queue screen's polling.
		-->
		<GuestView
			v-if="!isAdmin"
			v-show="!isQrCode && !isPrivacy && !isTerms"
			ref="guestView"
			:t="t"
			:locale="locale"
			:is-returning-visitor="isReturningVisitor"
			@select-language="selectLanguage"
		/>

		<AdminAuthView v-else :locale="locale" :view="adminView" @navigate="navigateAdmin" />

		<AppFooter :t="t" @back="showGuest" />
	</main>
</template>
