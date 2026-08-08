import { createApp, watch } from 'vue';

import App from './App.vue';
import { auth0 } from './auth';
import router from './router';

import './styles/admin.css';

const app = createApp(App).use(router);

if (auth0) {
	app.use(auth0);
	if (import.meta.env.DEV) {
		watch(auth0.error, (error) => {
			if (error) {
				console.error('Auth0 authentication failed:', error);
			}
		});
	}
}

app.mount('#app');
