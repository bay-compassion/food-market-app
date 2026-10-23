/// <reference types="node" />

import { createHmac, timingSafeEqual } from 'node:crypto';

import { jwtVerify, SignJWT } from 'jose';

import type { KioskUnlockCode } from '../../src/services/kiosk-unlock.js';

/**
 * How a room display proves it was unlocked by a worker, without signing in to anything.
 *
 * A worker holding `run:queue` asks for a six-digit **unlock code**; the display trades it for a
 * long-lived **kiosk token**, which it sends on every poll. Both come from one server secret,
 * `KIOSK_SECRET`, and nothing is stored: a code is an HMAC of the current five-minute window, the
 * way an authenticator app's codes are, and a token is a signed JWT. Rotating the secret relocks
 * every display at once.
 *
 * Neither check touches the database, so a passer-by trying codes — or a stale tab polling
 * without a token — never wakes it. That, more than secrecy, is the point: the board's data is
 * public queue numbers, but polling it keeps the backend running.
 */
export class KioskAccess {
	static readonly codeDigits = 6;
	/** A code is good for the window it was issued in and the one after: five to ten minutes. */
	static readonly codeWindowSeconds = 5 * 60;
	/** Long enough to leave a display alone for a season; a lapsed one asks for a code again. */
	static readonly tokenLifetimeSeconds = 180 * 24 * 60 * 60;
	private static readonly audience = 'kiosk';
	private static readonly minimumSecretLength = 32;

	private readonly codeKey: Buffer;
	private readonly tokenKey: Uint8Array;

	/** Fails closed: with no secret configured, no code can be issued and no display unlocked. */
	static fromEnvironment(): KioskAccess {
		const secret = process.env.KIOSK_SECRET;

		if (!secret || secret.length < KioskAccess.minimumSecretLength) {
			throw new Error(
				`KIOSK_SECRET must be set to at least ${KioskAccess.minimumSecretLength} characters.`,
			);
		}

		return new KioskAccess(secret);
	}

	constructor(
		secret: string,
		private readonly now: () => number = Date.now,
	) {
		// One secret, two keys, so a code can never be replayed as a token or the other way round.
		this.codeKey = createHmac('sha256', secret).update('kiosk-unlock-code').digest();
		this.tokenKey = createHmac('sha256', secret).update('kiosk-token').digest();
	}

	issueCode(): KioskUnlockCode {
		const window = this.currentWindow;

		return {
			code: this.codeFor(window),
			expiresAt: new Date((window + 2) * KioskAccess.codeWindowSeconds * 1000).toISOString(),
		};
	}

	/** The kiosk token a correct code buys, or null for a wrong or expired one. */
	async exchange(code: string): Promise<string | null> {
		const window = this.currentWindow;
		const valid = [window, window - 1].some((candidate) =>
			KioskAccess.sameCode(code, this.codeFor(candidate)),
		);

		if (!valid) {
			return null;
		}

		return new SignJWT({})
			.setProtectedHeader({ alg: 'HS256' })
			.setAudience(KioskAccess.audience)
			.setIssuedAt(this.nowSeconds)
			.setExpirationTime(this.nowSeconds + KioskAccess.tokenLifetimeSeconds)
			.sign(this.tokenKey);
	}

	async verify(token: string): Promise<boolean> {
		try {
			await jwtVerify(token, this.tokenKey, {
				audience: KioskAccess.audience,
				algorithms: ['HS256'],
				currentDate: new Date(this.now()),
			});

			return true;
		} catch {
			return false;
		}
	}

	private get nowSeconds(): number {
		return Math.floor(this.now() / 1000);
	}

	private get currentWindow(): number {
		return Math.floor(this.nowSeconds / KioskAccess.codeWindowSeconds);
	}

	/** RFC 4226's HOTP over the window number, with SHA-256 in place of SHA-1. */
	private codeFor(window: number): string {
		const counter = Buffer.alloc(8);

		counter.writeBigUInt64BE(BigInt(window));

		const digest = createHmac('sha256', this.codeKey).update(counter).digest();
		const offset = digest[digest.length - 1]! & 0x0f;
		const value = digest.readUInt32BE(offset) & 0x7fffffff;

		return String(value % 10 ** KioskAccess.codeDigits).padStart(KioskAccess.codeDigits, '0');
	}

	private static sameCode(given: string, expected: string): boolean {
		const a = Buffer.from(given);
		const b = Buffer.from(expected);

		return a.length === b.length && timingSafeEqual(a, b);
	}
}
