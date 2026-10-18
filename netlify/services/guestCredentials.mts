import { createHash, randomBytes } from 'node:crypto';

// Moved to the shared layer so the browser compares phone numbers exactly as the server does.
export { normalizePhone } from '../../src/services/phoneFormat.js';

export function issueVisitToken() {
	const token = randomBytes(32).toString('base64url');

	return { token, tokenHash: hashVisitToken(token) };
}

export function hashVisitToken(token: string) {
	return createHash('sha256').update(token).digest('hex');
}

export function issueDeviceToken() {
	const token = randomBytes(32).toString('base64url');

	return { token, tokenHash: hashDeviceToken(token) };
}

export function hashDeviceToken(token: string) {
	return createHash('sha256').update(token).digest('hex');
}

export function issueClaimToken() {
	const token = randomBytes(32).toString('base64url');

	return { token, tokenHash: hashClaimToken(token) };
}

export function hashClaimToken(token: string) {
	return createHash('sha256').update(token).digest('hex');
}
