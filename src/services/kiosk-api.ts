import type { QueueBoardState } from '../models/queue-board.ts';
import type { KioskUnlockResult } from './kiosk-unlock.ts';

/**
 * Why the room display could not read the queue: its token is missing, lapsed, or from a rotated
 * secret, so a worker has to unlock it again — or anything else, which the next poll retries.
 */
export type QueueBoardFailure = 'locked' | 'connection';

export type QueueBoardResult =
	| { ok: true; state: QueueBoardState }
	| { ok: false; failure: QueueBoardFailure };

/** Why an unlock code was not accepted. */
export type KioskUnlockFailure = 'wrong_code' | 'connection';

export type KioskUnlockOutcome =
	| { ok: true; token: string }
	| { ok: false; failure: KioskUnlockFailure };

export type KioskApiOptions = { request?: typeof fetch };

/**
 * The room display's two requests, reporting failure as a reason rather than throwing. Neither
 * signs in: the display holds a kiosk token, bought with a code a worker reads off their phone.
 */
export class KioskApi {
	constructor(private readonly options: KioskApiOptions = {}) {}

	async queueBoard(token: string): Promise<QueueBoardResult> {
		try {
			const response = await this.request('/api/kiosk/board', {
				headers: { Authorization: `Bearer ${token}` },
			});

			if (response.status === 401) {
				return { ok: false, failure: 'locked' };
			}

			if (!response.ok) {
				return { ok: false, failure: 'connection' };
			}

			return { ok: true, state: (await response.json()) as QueueBoardState };
		} catch {
			return { ok: false, failure: 'connection' };
		}
	}

	async unlock(code: string): Promise<KioskUnlockOutcome> {
		try {
			const response = await this.request('/api/kiosk/unlock', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code }),
			});

			if (response.status === 401) {
				return { ok: false, failure: 'wrong_code' };
			}

			if (!response.ok) {
				return { ok: false, failure: 'connection' };
			}

			const { token } = (await response.json()) as KioskUnlockResult;

			return { ok: true, token };
		} catch {
			return { ok: false, failure: 'connection' };
		}
	}

	private request(url: string, init: RequestInit): Promise<Response> {
		return (this.options.request ?? fetch)(url, init);
	}
}
