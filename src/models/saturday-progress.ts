import type { VisitStatus } from '../services/visitStateMachine.ts';

/** Where a step of the market Saturday stands for one guest. */
export type SaturdayStepState = 'past' | 'current' | 'upcoming';

/** How the current step is tagged: one the guest is doing now, or one they are waiting for. */
export type SaturdayMarker = 'now' | 'next';

/**
 * How far through a market Saturday a guest's visit has come, for marking off the same timeline the
 * closed market teaches. Steps are counted in the order the copy lists them: 0 register, 1 the
 * draw, 2 making your way to the market, 3 shopping.
 *
 * Told by the visit's status, not the clock: the times beside the steps are the usual Saturday's,
 * and a draw run late still leaves a registered guest waiting for it.
 */
export class SaturdayProgress {
	/** Registered: in the lottery, waiting for the draw. */
	static readonly awaitingDraw = new SaturdayProgress(1, 'next');

	/** Holding a number: on the way to the market until their turn comes. */
	static readonly travelling = new SaturdayProgress(2, 'now');

	private static readonly byStatus: Partial<Record<VisitStatus, SaturdayProgress>> = {
		registered: SaturdayProgress.awaitingDraw,
		waiting: SaturdayProgress.travelling,
	};

	/**
	 * The progress to show beside a visit, or `null` once the timeline has nothing left to tell — the
	 * guest is called, or the visit has an outcome.
	 */
	static forVisit(status: VisitStatus): SaturdayProgress | null {
		return SaturdayProgress.byStatus[status] ?? null;
	}

	private constructor(
		readonly currentStep: number,
		readonly marker: SaturdayMarker,
	) {}

	stateOf(step: number): SaturdayStepState {
		if (step < this.currentStep) {
			return 'past';
		}

		return step === this.currentStep ? 'current' : 'upcoming';
	}
}
