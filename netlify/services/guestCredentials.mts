import { createHash, randomBytes } from 'node:crypto';

export function normalizePhone(phone: string) {
	const digits = phone.replace(/\D/g, '');

	return `+${digits.length === 10 ? `1${digits}` : digits}`;
}

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
