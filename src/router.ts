import { authGuard } from '@auth0/auth0-vue';
import { createRouter, createWebHistory } from 'vue-router';

import AdminAuthView from '@/components/AdminAuthView.vue';
import GuestView from '@/components/guest-view/GuestView.vue';
import QrCodeView from '@/components/QrCodeView.vue';
import SignupView from '@/components/routes/SignupView.vue';

import { isAuth0Configured } from './auth';

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{ path: '/', name: 'guest', component: GuestView },
		{ path: '/signup', name: 'signup', component: SignupView },
		// Loaded on demand. These are the only React screens so far, so splitting them keeps React
		// out of the bundle a guest downloads to register — the path that matters on a phone in a
		// queue. Revisit once React is on the critical path anyway.
		{
			path: '/privacy',
			name: 'privacy',
			component: () => import('@/components/legal/PrivacyPage.vue'),
		},
		{
			path: '/terms',
			name: 'terms',
			component: () => import('@/components/legal/TermsPage.vue'),
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
