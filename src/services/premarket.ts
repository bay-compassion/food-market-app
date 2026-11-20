/**
 * The address the printed premarket QR opens. The code rides in the fragment, which a browser never
 * sends to a server, so it stays out of access logs, link previews, and `Referer`.
 */
export function premarketUrl(origin: string, code: string): string {
	return `${origin}/premarket#${encodeURIComponent(code)}`;
}

/** Reads the code back out of `location.hash`, or `null` when there is none worth sending. */
export function premarketCodeFromHash(hash: string): string | null {
	const code = decodeURIComponent(hash.replace(/^#/, '')).trim();

	return code.length >= 16 && code.length <= 200 ? code : null;
}

/**
 * Where a scanned code stands: its premarket is `open` now, `closed` (it is not market day, or the
 * draw has run), `invalid` (unknown or replaced), or `unreachable` when the check itself failed.
 */
export type PremarketCodeStatus = 'open' | 'closed' | 'invalid' | 'unreachable';

/** Asks whether a scanned code opens a premarket now. Never throws. */
export async function fetchPremarketStatus(code: string): Promise<PremarketCodeStatus> {
	try {
		const response = await fetch('/api/premarket-status', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ code }),
		});

		if (response.status === 410 || response.status === 400) {
			return 'invalid';
		}

		if (!response.ok) {
			return 'unreachable';
		}

		const { open } = (await response.json()) as { open: boolean };

		return open ? 'open' : 'closed';
	} catch {
		return 'unreachable';
	}
}
