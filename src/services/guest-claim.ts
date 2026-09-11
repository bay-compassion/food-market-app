/**
 * The address a worker's QR code opens on a guest's phone. The code rides in the fragment, which a
 * browser never sends to a server — so it stays out of access logs, link previews, and `Referer`.
 */
export function guestClaimUrl(origin: string, token: string): string {
	return `${origin}/claim#${encodeURIComponent(token)}`;
}

/** Reads the code back out of `location.hash`, or `null` when there is none worth sending. */
export function claimTokenFromHash(hash: string): string | null {
	const token = decodeURIComponent(hash.replace(/^#/, '')).trim();

	return token.length >= 32 && token.length <= 200 ? token : null;
}
