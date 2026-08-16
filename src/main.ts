import { createApp, watch } from 'vue';

import App from './App.vue';
import { auth0 } from './auth';
import router from './router';

// Order matters: tokens and resets first, then the app chrome, then the per-area stylesheets.
import './styles/base.css';
import './styles/app-shell.css';
import './styles/admin.css';
import './styles/guest.css';

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
