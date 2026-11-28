/// <reference types="node" />

import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * The code guests scan on the iPads at the market to pull a standby ticket: one per session, the
 * same all session long. It is `<session id>.<signature>`, the signature an HMAC of the session id,
 * so nothing is stored and a code for one session never works for another. See `docs/standby.md`
 * for why it doesn't change while the session runs: guests can't reach the shopping area before
 * shopping starts, so a photo texted off-site isn't worth stopping completely.
 *
 * It is keyed from `KIOSK_SECRET`, the room display's secret, under a label of its own, so the
 * displays and their standby codes rotate together and no second secret has to be configured.
 * Without the secret there is no code, and nobody can scan in; workers can still add guests to
 * standby by hand.
 */
export class StandbyCode {
	private static readonly minimumSecretLength = 32;
	private static readonly signatureLength = 22;

	private readonly key: Buffer;

	/** `null` when `KIOSK_SECRET` isn't configured. */
	static fromEnvironment(): StandbyCode | null {
		const secret = process.env.KIOSK_SECRET;

		return secret && secret.length >= StandbyCode.minimumSecretLength
			? new StandbyCode(secret)
			: null;
	}

	constructor(secret: string) {
		this.key = createHmac('sha256', secret).update('standby-code').digest();
	}

	/** The code for a session. */
	codeFor(marketEventId: string): string {
		return `${marketEventId}.${this.signatureOf(marketEventId)}`;
	}

	/** The session a code is for, or `null` for a code this secret never signed. */
	sessionOf(code: string): string | null {
		const [marketEventId, signature, ...rest] = code.split('.');

		if (!marketEventId || !signature || rest.length) {
			return null;
		}

		const expected = Buffer.from(this.signatureOf(marketEventId));
		const given = Buffer.from(signature);

		return expected.length === given.length && timingSafeEqual(expected, given)
			? marketEventId
			: null;
	}

	private signatureOf(marketEventId: string): string {
		return createHmac('sha256', this.key)
			.update(marketEventId)
			.digest('base64url')
			.slice(0, StandbyCode.signatureLength);
	}
}
