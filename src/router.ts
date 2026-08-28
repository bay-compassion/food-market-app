import { authGuard } from '@auth0/auth0-vue';
import { createRouter, createWebHistory } from 'vue-router';

import AdminAuthView from '@/components/AdminAuthView.vue';
import GuestView from '@/components/guest-view/GuestView.vue';
import PrivacyPage from '@/components/legal/PrivacyPage.vue';
import TermsPage from '@/components/legal/TermsPage.vue';
import QrCodeView from '@/components/QrCodeView.vue';
import SignupView from '@/components/routes/SignupView.vue';

import { isAuth0Configured } from './auth';

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{ path: '/', name: 'guest', component: GuestView },
		{ path: '/signup', name: 'signup', component: SignupView },
		{
			path: '/privacy',
			name: 'privacy',
			component: PrivacyPage,
		},
		{
			path: '/terms',
			name: 'terms',
			component: TermsPage,
		},
		{ path: '/qr-code', name: 'qr-code', component: QrCodeView },
		{
			path: '/admin/:view(current-session|queue|question-bank|guest-database|session-history|reports|dev-mode)?',
			name: 'admin',
			component: AdminAuthView,
			beforeEnter: isAuth0Configured ? authGuard : () => true,
		},
	],
});

export default router;
