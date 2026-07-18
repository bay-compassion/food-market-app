import { createAuth0 } from '@auth0/auth0-vue';

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

const settings = domain && clientId && audience ? { domain, clientId, audience } : null;

export const authReturnUrl = new URL('/', window.location.origin).toString();

export const auth0 = settings
	? createAuth0({
			domain: settings.domain,
			clientId: settings.clientId,
			authorizationParams: {
				audience: settings.audience,
				redirect_uri: authReturnUrl,
			},
		})
	: null;

export const isAuth0Configured = auth0 !== null;
