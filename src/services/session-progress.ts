import type { VisitStatus } from './visitStateMachine.ts';

/** A status a guest holds while service is still working through them. */
export type PipelineStatus = 'served' | 'called' | 'waiting' | 'no_show';

/** One status's share of the guests service has to work through today. */
export type ProgressSegment = {
	status: PipelineStatus;
	count: number;
	percent: number;
};

/** A status nobody in it is waiting on, and the count standing in it. */
export type OutsideServiceCount = {
	status: VisitStatus;
	count: number;
};

/**
 * The statuses a placed guest passes through, in the order the bar reads them: finished first,
 * still to come last.
 */
const pipelineStatuses: PipelineStatus[] = ['served', 'called', 'waiting', 'no_show'];

/**
 * The statuses outside today's service.
 *
 * `registered` belongs here rather than in the pipeline because a guest only reaches it after the
 * lottery by being added at the counter, and nobody is waiting on them until they are placed.
 */
const outsideServiceStatuses: VisitStatus[] = ['not_placed', 'cancelled', 'registered'];

/**
 * A percentage at the finest precision the bar can express.
 *
 * Four decimal places is a third of a pixel across a phone-width bar — past the point the rounding
 * is visible, and short of the point floating-point noise reaches the DOM as `7.1e-15%`.
 */
function roundedPercent(value: number): number {
	return Number(value.toFixed(4));
}

/**
 * How far service has worked through the guests the lottery placed.
 *
 * The dashboard used to give each visit status its own tile, which spent the same space and the
 * same emphasis on the four that barely move during service as on the three that do. This measures
 * the one thing a worker asks mid-service — how far along are we — against the guests actually
 * placed today, so the answer needs nothing the session does not already report.
 */
export class SessionProgress {
	constructor(private readonly counts: Partial<Record<VisitStatus, number>>) {}

	get served(): number {
		return this.countOf('served');
	}

	/** Everyone placed in today's service, whether or not they have been through it yet. */
	get placed(): number {
		return pipelineStatuses.reduce((total, status) => total + this.countOf(status), 0);
	}

	/**
	 * Each pipeline status as its share of `placed`.
	 *
	 * The last segment takes whatever the others left rather than dividing for itself: four
	 * independently rounded percentages leave a sliver of empty track showing through the bar.
	 * Each share is rounded before it is claimed, so an even split leaves the last segment an
	 * honest zero instead of the floating-point crumb subtracting exact thirds would.
	 */
	get segments(): ProgressSegment[] {
		const placed = this.placed;
		let unclaimed = 100;

		return pipelineStatuses.map((status, index) => {
			const count = this.countOf(status);
			const isLast = index === pipelineStatuses.length - 1;
			const share = isLast ? unclaimed : (count / placed) * 100;
			const percent = placed === 0 ? 0 : Math.max(0, roundedPercent(share));

			unclaimed -= percent;

			return { status, count, percent };
		});
	}

	/** The counts service is not working through, for the line under the bar. */
	get outsideService(): OutsideServiceCount[] {
		return outsideServiceStatuses.map((status) => ({ status, count: this.countOf(status) }));
	}

	private countOf(status: VisitStatus): number {
		return this.counts[status] ?? 0;
	}
}
