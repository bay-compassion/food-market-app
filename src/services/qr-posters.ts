/**
 * The printable QR code posters only admins hand out: the premarket's, the same every week, and
 * standby's, one per session. Both sit under `/admin` so only a signed-in worker reaches them, and
 * `App` hides the bar there when printing, as on `/qr-code`. See `docs/standby.md`.
 */
export const standbyPosterPath = '/admin/standby-code';

/** Who may print the posters, and see them in the app bar: admins and team leaders. */
export const posterPermission = 'manage:sessions';

/** Reads the current session's standby code, or `null` when there is none to print. Throws on failure. */
export async function fetchStandbyCode(headers: HeadersInit): Promise<string | null> {
	const response = await fetch('/api/admin/standby-code', { headers });

	if (!response.ok) {
		throw new Error(`The standby code couldn’t be read (${response.status}).`);
	}

	return ((await response.json()) as { code: string | null }).code;
}
