/// <reference types="node" />

import { createRemoteJWKSet, jwtVerify } from 'jose';

import {
	grantedPermissions,
	hasPermission,
	type Permission,
} from '../../src/services/permissions.js';

// Keep jose's key cache, refresh cooldown, and in-flight fetch deduplication across warm requests.
let cachedJwks: { issuer: string; resolve: ReturnType<typeof createRemoteJWKSet> } | undefined;

function auth0Settings() {
	const issuer = (process.env.AUTH0_ISSUER ?? process.env.VITE_AUTH0_ISSUER)?.replace(/\/?$/, '/');
	const audience = process.env.AUTH0_AUDIENCE ?? process.env.VITE_AUTH0_AUDIENCE;

	if (!issuer || !audience) {
		throw new Error('Auth0 environment variables are not configured.');
	}

	return { issuer, audience };
}

/**
 * The access-token claim carrying the signed-in worker's display name. Auth0 does not put a name in
 * an access token on its own; an Action adds it under this namespaced key (see `docs/roles.md`).
 */
export const workerNameClaim = 'https://thebaycompassion.org/claims/name';

/** Longest name kept from the claim; anything longer is cut, never rejected. */
const workerNameMaxLength = 80;

/**
 * The worker's name from a verified token payload, or null when the claim is missing, empty, or
 * not a string — a token issued before the Action existed must still work.
 */
export function workerNameFrom(payload: Record<string, unknown>): string | null {
	const name = payload[workerNameClaim];

	if (typeof name !== 'string') {
		return null;
	}

	const trimmed = name.trim().slice(0, workerNameMaxLength);

	return trimmed || null;
}

export async function verifyAuth0Token(request: Request) {
	const authorization = request.headers.get('Authorization') ?? '';
	const match = authorization.match(/^Bearer\s+(\S+)$/);

	if (!match) {
		throw new Error('Missing or invalid Authorization header.');
	}

	const { issuer, audience } = auth0Settings();

	if (cachedJwks?.issuer !== issuer) {
		cachedJwks = {
			issuer,
			resolve: createRemoteJWKSet(new URL('.well-known/jwks.json', issuer)),
		};
	}

	return jwtVerify(match[1]!, cachedJwks.resolve, {
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
export async function requirePermission(
	request: Request,
	permission: Permission,
	verifiedPermissions?: Permission[],
) {
	let permissions = verifiedPermissions;

	try {
		// Standalone route handlers still fail closed without the parent middleware.
		if (!permissions) {
			const { payload } = await verifyAuth0Token(request);

			permissions = grantedPermissions(payload.permissions);
		}
	} catch {
		return Response.json({ error: 'Authorization required.' }, { status: 401 });
	}

	if (!hasPermission(permissions, permission)) {
		return Response.json({ error: 'Your account does not have access to this.' }, { status: 403 });
	}

	return null;
}
