/// <reference types="node" />

import { createRemoteJWKSet, jwtVerify } from 'jose';

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

export async function requireAuth0(request: Request) {
	try {
		await verifyAuth0Token(request);

		return null;
	} catch {
		return Response.json({ error: 'Authorization required.' }, { status: 401 });
	}
}
