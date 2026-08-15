import { authGuard } from '@auth0/auth0-vue';
import { createRouter, createWebHistory } from 'vue-router';

import App from './App.vue';
import { isAuth0Configured } from './auth';

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{ path: '/', name: 'guest', component: App },
		{ path: '/signup', name: 'signup', component: App },
		{ path: '/privacy', name: 'privacy', component: App },
		{ path: '/terms', name: 'terms', component: App },
		{ path: '/qr-code', name: 'qr-code', component: App },
		{
			path: '/admin/:view(current-session|queue|question-bank|guest-database|session-history|reports|dev-mode)?',
			name: 'admin',
			component: App,
			beforeEnter: isAuth0Configured ? authGuard : () => true,
		},
	],
});

export default router;
