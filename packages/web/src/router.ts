import { createRouter, createWebHistory } from 'vue-router';

import App from './App.vue';

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{ path: '/', name: 'guest', component: App },
		{ path: '/admin', name: 'admin', component: App },
	],
});

export default router;
