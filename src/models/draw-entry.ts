import type { VisitStatus } from '../services/visitStateMachine.ts';

/** What it takes to tell whether a visit went through a draw. */
export type DrawEntryVisit = {
	status: VisitStatus;
	source: string;
	queuePosition: number | null;
	/** Whether its history records the draw drawing it or passing it over. */
	hasDrawEvent: boolean;
};

/**
 * Whether a visit went through the draw, and how it came out.
 *
 * `visits` doesn't record how a worker admitted a guest, so a worker's draw entry and a worker's
 * place in line look the same once both are `waiting`. The history tells them apart. Visits older
 * than the history have none, so those count when the guest registered themselves and the visit
 * reached a state only the draw could put it in. `lotteryOutcomes` in `netlify/services/reports.mts`
 * applies this same definition in SQL.
 */
export class DrawEntry {
	private static readonly placedStatuses: readonly VisitStatus[] = [
		'waiting',
		'called',
		'served',
		'no_show',
	];

	constructor(private readonly visit: DrawEntryVisit) {}

	get entered(): boolean {
		const { hasDrawEvent, source, status, queuePosition } = this.visit;

		if (hasDrawEvent) {
			return true;
		}

		return (
			source === 'self' &&
			(status === 'not_placed' ||
				DrawEntry.placedStatuses.includes(status) ||
				(status === 'cancelled' && queuePosition !== null))
		);
	}

	get won(): boolean {
		return this.entered && this.visit.status !== 'not_placed';
	}
}
