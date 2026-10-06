/**
 * Why an unattended screen — the room display, the print station — could not reach the server.
 * Each asks for something different.
 */
export type StationFailure =
	/** No usable token, or the server refused it: someone has to sign the screen in again. */
	| 'sign_in'
	/** Signed in as an account without the permission: signing in again as the same one won't help. */
	| 'forbidden'
	/** Anything else — the network, the server. Worth retrying on the next poll. */
	| 'connection';

export type StationResponse =
	| { ok: true; response: Response }
	| { ok: false; failure: StationFailure };

export type StationRequestOptions = {
	requestHeaders: () => HeadersInit | Promise<HeadersInit>;
	request?: typeof fetch;
};

/** Sends an authenticated request for a screen nobody is watching, reporting failure as a reason. */
export async function stationRequest(
	options: StationRequestOptions,
	url: string,
	init: RequestInit = {},
): Promise<StationResponse> {
	let headers: HeadersInit;

	try {
		headers = await options.requestHeaders();
	} catch {
		// Auth0 could not renew the token silently — its session lapsed or was revoked.
		return { ok: false, failure: 'sign_in' };
	}

	try {
		const response = await (options.request ?? fetch)(url, { ...init, headers });

		if (response.status === 401) {
			return { ok: false, failure: 'sign_in' };
		}

		if (response.status === 403) {
			return { ok: false, failure: 'forbidden' };
		}

		return response.ok ? { ok: true, response } : { ok: false, failure: 'connection' };
	} catch {
		return { ok: false, failure: 'connection' };
	}
}
