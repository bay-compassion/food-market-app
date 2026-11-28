/**
 * Standby, from a guest's phone: the address the iPads' QR code opens, and pulling a ticket with the
 * code it carries. See `docs/standby.md`.
 */

/** The address a standby code opens on a guest's phone. The code rides in the fragment. */
export function standbyUrl(origin: string, code: string): string {
	return `${origin}/standby#${encodeURIComponent(code)}`;
}

/** The code in a `/standby` address's fragment, or `null` for an address without one. */
export function standbyCodeFrom(hash: string): string | null {
	const code = decodeURIComponent(hash.replace(/^#/, '')).trim();

	return code || null;
}

/** A place on the standby list, held for this phone until its guest fills in their details. */
export type StandbyTicket = {
	/** The code it was pulled with, so a scan of the same session's code finds it again. */
	code: string;
	ticket: string;
	standbyNumber: number;
	marketEventId: string;
};

/**
 * What pulling a ticket came to: a ticket; standby `not_open` yet (nobody has been called); the
 * session `closed`; a code that is `invalid`; or `unreachable` when the request itself failed.
 */
export type StandbyTicketResult =
	| { kind: 'ticket'; ticket: StandbyTicket }
	| { kind: 'not_open' | 'closed' | 'invalid' | 'unreachable' };

/** Pulls a ticket for a scanned code. Never throws. */
export async function pullStandbyTicket(code: string): Promise<StandbyTicketResult> {
	try {
		const response = await fetch('/api/standby-ticket', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ code }),
		});

		if (response.ok) {
			const body = (await response.json()) as Omit<StandbyTicket, 'code'>;

			return { kind: 'ticket', ticket: { ...body, code } };
		}

		switch (response.status) {
			case 409:
				return { kind: 'not_open' };
			case 410:
				return { kind: 'closed' };
			case 400:
			case 404:
				return { kind: 'invalid' };
			default:
				return { kind: 'unreachable' };
		}
	} catch {
		return { kind: 'unreachable' };
	}
}
