import { createServer } from 'node:http';

import { exportJWK, generateKeyPair, SignJWT } from 'jose';

import { permissions } from '../src/services/permissions.js';

/** A fresh issuer per run; the application's normal JWT verifier remains in charge. */
export async function startTestIdentity() {
	const { publicKey, privateKey } = await generateKeyPair('RS256');
	const jwk = { ...(await exportJWK(publicKey)), kid: 'queue-rig', alg: 'RS256', use: 'sig' };
	const server = createServer((request, response) => {
		if (request.url !== '/.well-known/jwks.json') {
			response.writeHead(404).end();

			return;
		}
		response.writeHead(200, { 'Content-Type': 'application/json' });
		response.end(JSON.stringify({ keys: [jwk] }));
	});

	await new Promise<void>((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolve);
	});
	const address = server.address();

	if (!address || typeof address === 'string') {
		throw new Error('Test issuer failed to listen.');
	}

	const issuer = `http://127.0.0.1:${address.port}/`;
	const audience = 'queue-rig';
	const token = await new SignJWT({ permissions: [...permissions] })
		.setProtectedHeader({ alg: 'RS256', kid: jwk.kid })
		.setSubject('queue-test-admin')
		.setIssuer(issuer)
		.setAudience(audience)
		.setIssuedAt()
		.setExpirationTime('12h')
		.sign(privateKey);

	return {
		issuer,
		audience,
		token,
		stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
	};
}
