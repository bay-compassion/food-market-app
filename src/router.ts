import { authGuard } from '@auth0/auth0-vue';
import { createRouter, createWebHistory } from 'vue-router';

import App from './App.vue';
import { isAuth0Configured } from './auth';

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{ path: '/', name: 'guest', component: App },
		{
			path: '/admin/:view(current-session|question-bank|guest-database|session-history)?',
			name: 'admin',
			component: App,
			beforeEnter: isAuth0Configured ? authGuard : () => true,
		},
	],
});

export default router;
