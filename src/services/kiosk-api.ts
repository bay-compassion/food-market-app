import type { QueueBoardState } from '../models/queue-board.ts';
import {
	stationRequest,
	type StationFailure,
	type StationRequestOptions,
} from './station-request.ts';

/** Why the room display could not read the queue. */
export type QueueBoardFailure = StationFailure;

export type QueueBoardResult =
	| { ok: true; state: QueueBoardState }
	| { ok: false; failure: QueueBoardFailure };

export type KioskApiOptions = StationRequestOptions;

/** The room display's one request, reporting failure as a reason rather than throwing. */
export class KioskApi {
	constructor(private readonly options: KioskApiOptions) {}

	async queueBoard(): Promise<QueueBoardResult> {
		const result = await stationRequest(this.options, '/api/admin/kiosk');

		if (!result.ok) {
			return result;
		}

		try {
			return { ok: true, state: (await result.response.json()) as QueueBoardState };
		} catch {
			return { ok: false, failure: 'connection' };
		}
	}
}
