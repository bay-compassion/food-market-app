import { createApp, watch } from 'vue';

import App from './App.vue';
import { auth0 } from './auth';
import router from './router';
import { RootStore, rootStoreKey } from './stores/root.store';

// Order matters: tokens and resets first, then the app chrome, then the per-area stylesheets.
import './styles/base.css';
import './styles/app-shell.css';
import './styles/admin.css';

const rootStore = new RootStore();
const app = createApp(App).use(router).provide(rootStoreKey, rootStore);

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

rootStore.start();
app.mount('#app');

if (import.meta.hot) {
	import.meta.hot.dispose(() => rootStore[Symbol.dispose]());
}
