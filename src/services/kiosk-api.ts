import type { QueueBoardState } from '../models/queue-board.ts';

/** Why the room display could not read the queue. Each one asks for something different. */
export type QueueBoardFailure =
	/** No usable token, or the server refused it: a worker has to sign the display in again. */
	| 'sign_in'
	/** Signed in as an account without `view:kiosk`: signing in again as the same one won't help. */
	| 'forbidden'
	/** Anything else — the network, the server. Worth retrying on the next poll. */
	| 'connection';

export type QueueBoardResult =
	| { ok: true; state: QueueBoardState }
	| { ok: false; failure: QueueBoardFailure };

export type KioskApiOptions = {
	requestHeaders: () => HeadersInit | Promise<HeadersInit>;
	request?: typeof fetch;
};

/** The room display's one request, reporting failure as a reason rather than throwing. */
export class KioskApi {
	private readonly request: typeof fetch;

	constructor(private readonly options: KioskApiOptions) {
		this.request = options.request ?? ((input, init) => fetch(input, init));
	}

	async queueBoard(): Promise<QueueBoardResult> {
		let headers: HeadersInit;

		try {
			headers = await this.options.requestHeaders();
		} catch {
			// Auth0 could not renew the token silently — its session lapsed or was revoked.
			return { ok: false, failure: 'sign_in' };
		}

		try {
			const response = await this.request('/api/admin/kiosk', { headers });

			if (response.status === 401) {
				return { ok: false, failure: 'sign_in' };
			}

			if (response.status === 403) {
				return { ok: false, failure: 'forbidden' };
			}

			if (!response.ok) {
				return { ok: false, failure: 'connection' };
			}

			return { ok: true, state: (await response.json()) as QueueBoardState };
		} catch {
			return { ok: false, failure: 'connection' };
		}
	}
}
