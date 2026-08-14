/// <reference types="node" />

import { createRemoteJWKSet, jwtVerify } from 'jose';

import {
	grantedPermissions,
	hasPermission,
	type Permission,
} from '../../src/services/permissions.js';

function auth0Settings() {
	const issuer = (process.env.AUTH0_ISSUER ?? process.env.VITE_AUTH0_ISSUER)?.replace(/\/?$/, '/');
	const audience = process.env.AUTH0_AUDIENCE ?? process.env.VITE_AUTH0_AUDIENCE;

	if (!issuer || !audience) {
		throw new Error('Auth0 environment variables are not configured.');
	}

	return { issuer, audience };
}

export async function verifyAuth0Token(request: Request) {
	const authorization = request.headers.get('Authorization') ?? '';
	const match = authorization.match(/^Bearer\s+(\S+)$/);

	if (!match) {
		throw new Error('Missing or invalid Authorization header.');
	}

	const { issuer, audience } = auth0Settings();
	const jwks = createRemoteJWKSet(new URL('.well-known/jwks.json', issuer));

	return jwtVerify(match[1]!, jwks, {
		issuer,
		audience,
		algorithms: ['RS256'],
	});
}

/**
 * Gates a request on one Auth0 API permission, returning null when it is allowed through.
 *
 * The two failures are deliberately different: a missing or invalid token is a **401**, meaning
 * sign in, while a valid token without the permission is a **403**, meaning signing in again will
 * not help. The browser needs to tell those apart — retrying the first is right and retrying the
 * second is a loop.
 */
export async function requirePermission(request: Request, permission: Permission) {
	let claims;
	try {
		claims = await verifyAuth0Token(request);
	} catch {
		return Response.json({ error: 'Authorization required.' }, { status: 401 });
	}

	if (!hasPermission(grantedPermissions(claims.payload.permissions), permission)) {
		return Response.json({ error: 'Your account does not have access to this.' }, { status: 403 });
	}

	return null;
}
