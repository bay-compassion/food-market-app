import { createAuth0 } from '@auth0/auth0-vue';
import { decodeJwt } from 'jose';

import { grantedPermissions, permissions, type Permission } from './services/permissions';

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

/**
 * The permissions in an access token, read **without verifying the signature**.
 *
 * This exists only to decide what the admin screens offer — a worker should not be shown a button
 * that will come back 403. It is not a security check and must never be treated as one: the token
 * is handed to us by the browser, and only the server, which verifies it against Auth0's keys in
 * `netlify/lib/auth.ts`, decides what actually happens.
 *
 * Anything unreadable yields no permissions. Callers decide what to do about that — see
 * `everyPermission` for the case where there is no Auth0 to read a token from in the first place.
 */
export function permissionsFromToken(token: string): Permission[] {
	try {
		return grantedPermissions(decodeJwt(token).permissions);
	} catch {
		return [];
	}
}

/**
 * Every permission, for running the admin area with no Auth0 configured at all. Local development
 * has no tokens and no server-side gate either, so withholding screens there would only lock a
 * developer out of the app they are working on.
 */
export function everyPermission(): Permission[] {
	return [...permissions];
}
