/** The address volunteers open — from the QR code or a shared link — to check in for the premarket. */
export function premarketUrl(origin: string): string {
	return `${origin}/premarket`;
}

/**
 * Whether the premarket takes check-ins: `open` now, `closed` (it is not market day, or the session
 * has ended), or `unreachable` when the check itself failed.
 */
export type PremarketStatus = 'open' | 'closed' | 'unreachable';

/** Asks whether the current session's premarket takes check-ins now. Never throws. */
export async function fetchPremarketStatus(): Promise<PremarketStatus> {
	try {
		const response = await fetch('/api/premarket-status');

		if (!response.ok) {
			return 'unreachable';
		}

		const { open } = (await response.json()) as { open: boolean };

		return open ? 'open' : 'closed';
	} catch {
		return 'unreachable';
	}
}
