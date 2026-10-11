/**
 * The install ID: a random UUID a browser creates the first time it opens the app and keeps for as
 * long as its site data lasts. It names the device, never the guest — it is not a credential, is
 * never sent to the server as part of anyone's identity, and stays put across "Forget me" — so it
 * is safe to put on every Sentry event and every API request, which is how one device's traces are
 * found on both sides. See "Install ID" in `docs/observability.md`.
 *
 * Shared by the browser, which sends it, and `netlify/lib/http.mts`, which reads it.
 */

/** The request header the browser sends the install ID in. */
export const INSTALL_ID_HEADER = 'X-Install-Id';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Whether a value is shaped like an install ID. The header comes from whoever sent the request, so
 * the server keeps only a value this accepts — nothing else reaches a log line or a Sentry tag.
 */
export function isInstallId(value: unknown): value is string {
	return typeof value === 'string' && uuidPattern.test(value);
}
