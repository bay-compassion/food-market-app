import * as Sentry from '@sentry/react';
import { comparer, reaction } from 'mobx';

import { sentrySettings } from './sentry-settings.ts';
import type { GuestStore } from './stores/guest.store.ts';

/** Whether this build names guests in Sentry events. Set with `VITE_SENTRY_USER_INFO_ENABLED`. */
export const isUserInfoEnabled: boolean = sentrySettings(import.meta.env)?.userInfoEnabled ?? false;

type IdentifiableGuest = Pick<GuestStore, 'deviceId' | 'displayedName'>;

/**
 * Names the guest on this device in every Sentry event, so a beta tester who ran into a problem can
 * be found and followed up with. It is for internal testers during the beta only; see
 * `docs/observability.md` for why it is never meant to be on for a real market.
 *
 * The user follows the guest store rather than being read once, because a guest who registers or
 * forgets this device mid-session changes who the next event belongs to.
 *
 * The device token is a bearer credential — the server authenticates a guest by it — so it never
 * leaves the browser. The user's `id` is its SHA-256 digest instead, which is exactly the
 * `device_token_hash` column the server stores, so a Sentry user can be looked up in the database
 * without Sentry ever holding something that could act as the guest.
 */
export class SentryUserReporter implements Disposable {
	private readonly stopReacting: () => void;
	/** Bumped on every change, so a digest that resolves after a newer one is discarded. */
	private revision = 0;

	constructor(guest: IdentifiableGuest) {
		this.stopReacting = reaction(
			() => ({ deviceToken: guest.deviceId, name: guest.displayedName }),
			({ deviceToken, name }) => void this.report(deviceToken, name),
			{ equals: comparer.structural, fireImmediately: true },
		);
	}

	private async report(deviceToken: string | null, name: string | null): Promise<void> {
		const revision = ++this.revision;

		// `crypto.subtle` only exists in a secure context, so a build opened over plain HTTP on a LAN
		// address reports nobody rather than falling back to the token.
		if (!deviceToken || !globalThis.crypto?.subtle) {
			Sentry.setUser(null);

			return;
		}

		const id = await sha256Hex(deviceToken);

		if (revision !== this.revision) {
			return;
		}

		// `username` rather than `name`, because it is the field the feedback form prefills its name
		// input from by default.
		Sentry.setUser(name ? { id, username: name } : { id });
	}

	[Symbol.dispose](): void {
		this.stopReacting();
		this.revision++;
		Sentry.setUser(null);
	}
}

async function sha256Hex(value: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));

	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
