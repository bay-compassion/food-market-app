import type { NameTagPrintJob } from './print-jobs.ts';
import {
	stationRequest,
	type StationFailure,
	type StationRequestOptions,
} from './station-request.ts';

export type PrintJobsResult =
	| { ok: true; jobs: NameTagPrintJob[] }
	| { ok: false; failure: StationFailure };

/** The print station's requests, reporting failure as a reason rather than throwing. */
export class PrintStationApi {
	constructor(private readonly options: StationRequestOptions) {}

	/** Collects the tags waiting to print. The server counts each collection as the station's heartbeat. */
	async printJobs(): Promise<PrintJobsResult> {
		const result = await stationRequest(this.options, '/api/admin/print-jobs');

		if (!result.ok) {
			return result;
		}

		try {
			const { jobs } = (await result.response.json()) as { jobs: NameTagPrintJob[] };

			return { ok: true, jobs };
		} catch {
			return { ok: false, failure: 'connection' };
		}
	}

	/** Removes a printed tag. Resolves to whether the server took it off the queue. */
	async complete(id: string): Promise<boolean> {
		const result = await stationRequest(
			this.options,
			`/api/admin/print-jobs/${encodeURIComponent(id)}`,
			{ method: 'DELETE' },
		);

		return result.ok;
	}
}
