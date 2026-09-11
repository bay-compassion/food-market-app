import type { AppState } from '@auth0/auth0-react';
import { decodeJwt } from 'jose';

import { grantedPermissions, permissions, type Permission } from './services/permissions';

const domain = import.meta.env.VITE_AUTH0_DOMAIN;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

const settings = domain && clientId && audience ? { domain, clientId, audience } : null;

export const authReturnUrl = new URL('/', window.location.origin).toString();

/** What `Auth0Provider` needs, or `null` when the environment has no Auth0 configured. */
export const auth0Settings = settings
	? {
			domain: settings.domain,
			clientId: settings.clientId,
			authorizationParams: {
				audience: settings.audience,
				redirect_uri: authReturnUrl,
			},
		}
	: null;

export const isAuth0Configured = auth0Settings !== null;

/**
 * Where a completed sign-in should land, from the `appState` the redirect carried.
 *
 * Auth0 always returns to `redirect_uri`, which is the app's root — the one callback URL the
 * tenant is configured with. The screen that started the sign-in records where it actually wanted
 * to be, and this reads it back.
 *
 * Only a path within this app is honoured. `appState` survives the round trip in session storage,
 * so treating whatever comes back as a destination would be an open redirect; a value that is not
 * an in-app absolute path (including a protocol-relative `//host`) falls back to the guest view.
 */
export function returnToPath(appState?: AppState): string {
	const returnTo: unknown = appState?.returnTo;

	return typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//')
		? returnTo
		: '/';
}

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
