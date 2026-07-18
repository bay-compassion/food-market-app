import { createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import { eq } from 'drizzle-orm';

import { db } from '../../db/index.js';
import { guestPinAttempts, guests } from '../../db/schema.js';

const scrypt = promisify(nodeScrypt);
const attemptWindowMs = 15 * 60_000;
const lockDurationMs = 30 * 60_000;
const maximumFailures = 5;

export function normalizePhone(phone: string) {
	const digits = phone.replace(/\D/g, '');

	return `+${digits.length === 10 ? `1${digits}` : digits}`;
}

export function isValidPin(pin: string) {
	return /^\d{4,8}$/.test(pin);
}

export async function hashPin(pin: string) {
	const salt = randomBytes(16);
	const derived = (await scrypt(pin, salt, 64)) as Buffer;

	return `scrypt:${salt.toString('base64url')}:${derived.toString('base64url')}`;
}

export async function verifyPin(pin: string, storedHash: string) {
	const [algorithm, encodedSalt, encodedHash] = storedHash.split(':');
	if (algorithm !== 'scrypt' || !encodedSalt || !encodedHash) {
		return false;
	}
	const expected = Buffer.from(encodedHash, 'base64url');
	const actual = (await scrypt(
		pin,
		Buffer.from(encodedSalt, 'base64url'),
		expected.length,
	)) as Buffer;

	return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function recordFailure(normalizedPhone: string, now: Date) {
	const [attempt] = await db
		.select()
		.from(guestPinAttempts)
		.where(eq(guestPinAttempts.normalizedPhone, normalizedPhone))
		.limit(1);
	if (!attempt || now.valueOf() - attempt.windowStartedAt.valueOf() > attemptWindowMs) {
		await db
			.insert(guestPinAttempts)
			.values({ normalizedPhone, failureCount: 1, windowStartedAt: now, lockedUntil: null })
			.onConflictDoUpdate({
				target: guestPinAttempts.normalizedPhone,
				set: { failureCount: 1, windowStartedAt: now, lockedUntil: null },
			});

		return;
	}
	const failureCount = attempt.failureCount + 1;
	await db
		.update(guestPinAttempts)
		.set({
			failureCount,
			lockedUntil:
				failureCount >= maximumFailures ? new Date(now.valueOf() + lockDurationMs) : null,
		})
		.where(eq(guestPinAttempts.normalizedPhone, normalizedPhone));
}

export async function authenticateGuest(phone: string, pin: string) {
	const normalizedPhone = normalizePhone(phone);
	const now = new Date();
	const [attempt] = await db
		.select()
		.from(guestPinAttempts)
		.where(eq(guestPinAttempts.normalizedPhone, normalizedPhone))
		.limit(1);
	if (attempt?.lockedUntil && attempt.lockedUntil > now) {
		return null;
	}
	const candidates = await db
		.select()
		.from(guests)
		.where(eq(guests.normalizedPhone, normalizedPhone))
		.limit(20);
	const matches = [];
	for (const candidate of candidates) {
		if (candidate.pinHash && (await verifyPin(pin, candidate.pinHash))) {
			matches.push(candidate);
		}
	}
	if (matches.length !== 1) {
		await recordFailure(normalizedPhone, now);

		return null;
	}
	await db.delete(guestPinAttempts).where(eq(guestPinAttempts.normalizedPhone, normalizedPhone));

	return matches[0]!;
}

export function issueVisitToken() {
	const token = randomBytes(32).toString('base64url');

	return { token, tokenHash: hashVisitToken(token) };
}

export function hashVisitToken(token: string) {
	return createHash('sha256').update(token).digest('hex');
}
