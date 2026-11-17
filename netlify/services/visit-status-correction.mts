import { and, eq } from 'drizzle-orm';

import type { db as appDatabase } from '../../db/index.mjs';
import { marketEvents, visits } from '../../db/schema.mjs';
import { VisitStatusCorrection } from '../../src/models/visit-status-correction.js';
import type { VisitEventActor } from '../../src/services/visit-events.js';
import type { VisitStatus } from '../../src/services/visitStateMachine.js';
import { recordVisitEvents } from './visit-events.mjs';

type Database = typeof appDatabase;

export type StatusCorrectionRequest = {
	/** The status the visit was in when the person correcting it read it. */
	from: VisitStatus;
	to: VisitStatus;
	actor: VisitEventActor;
};

export type StatusCorrectionResult =
	| { ok: true; visit: { id: string; status: VisitStatus } }
	| { ok: false; status: 404 | 409; error: string };

/** Thrown inside the transaction to roll it back with the refusal it carries. */
class CorrectionRefused extends Error {
	constructor(readonly result: StatusCorrectionResult & { ok: false }) {
		super(result.error);
	}
}

const notFound = { ok: false, status: 404, error: 'Visit not found in this session.' } as const;

/**
 * Reconciling one visit in an ended session: setting the status it should have had, and recording
 * the change in its history beside who made it. See `VisitStatusCorrection` for which statuses it
 * allows.
 */
export class VisitStatusCorrectionService {
	constructor(
		private readonly db: Database,
		private readonly marketEventId: string,
		private readonly visitId: string,
	) {}

	/**
	 * Applies the correction. The session row is locked so it cannot be reset or reopened while the
	 * visit changes, and the update re-checks `from` in its `WHERE`, so a correction made from a
	 * stale list — someone else corrected the visit first — is refused rather than overwriting theirs.
	 */
	async apply({ from, to, actor }: StatusCorrectionRequest): Promise<StatusCorrectionResult> {
		const correction = new VisitStatusCorrection(from);

		if (!correction.allows(to)) {
			return { ok: false, status: 409, error: 'That status cannot be set on an ended session.' };
		}

		try {
			return await this.db.transaction(async (tx) => {
				const [event] = await tx
					.select({ status: marketEvents.status })
					.from(marketEvents)
					.where(eq(marketEvents.id, this.marketEventId))
					.limit(1)
					.for('update');

				if (!event) {
					throw new CorrectionRefused({ ok: false, status: 404, error: 'Session not found.' });
				}

				if (event.status !== 'ended') {
					throw new CorrectionRefused({
						ok: false,
						status: 409,
						error: 'Statuses can only be corrected once the session has ended.',
					});
				}

				const [visit] = await tx
					.update(visits)
					.set(correction.changes(to))
					.where(
						and(
							eq(visits.id, this.visitId),
							eq(visits.marketEventId, this.marketEventId),
							eq(visits.status, from),
						),
					)
					.returning({ id: visits.id, status: visits.status });

				if (!visit) {
					throw new CorrectionRefused(await this.whyNotUpdated(tx));
				}

				await recordVisitEvents(tx, [
					{
						visitId: visit.id,
						kind: 'corrected',
						toStatus: visit.status,
						actor,
						details: { fromStatus: from },
					},
				]);

				return { ok: true, visit } as const;
			});
		} catch (error) {
			if (error instanceof CorrectionRefused) {
				return error.result;
			}

			throw error;
		}
	}

	/** Tells a visit that is not in this session apart from one whose status has since changed. */
	private async whyNotUpdated(
		tx: Parameters<Parameters<Database['transaction']>[0]>[0],
	): Promise<StatusCorrectionResult & { ok: false }> {
		const [visit] = await tx
			.select({ id: visits.id })
			.from(visits)
			.where(and(eq(visits.id, this.visitId), eq(visits.marketEventId, this.marketEventId)))
			.limit(1);

		return visit
			? {
					ok: false,
					status: 409,
					error: 'This guest’s status changed since the list was loaded. Refresh and try again.',
				}
			: notFound;
	}
}
