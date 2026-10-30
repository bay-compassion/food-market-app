import type { SessionStatus } from '../services/sessionStateMachine.ts';
import type { VisitStatus } from '../services/visitStateMachine.ts';

/** Where a step of the market Saturday stands for one guest. */
export type SaturdayStepState = 'past' | 'current' | 'upcoming' | 'skipped';

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
	/** General overview when the guest has no visit. */
	static readonly overview = new SaturdayProgress(0, 'next');

	/** Registered: in the lottery, waiting for the draw. */
	static readonly awaitingDraw = new SaturdayProgress(1, 'next');

	/** Holding a number: on the way to the market until their turn comes. */
	static readonly travelling = new SaturdayProgress(2, 'now');

	/** The draw is over, and this guest was not given a number. */
	static readonly notPlaced = new SaturdayProgress(4, null, true);

	private static readonly byStatus: Partial<Record<VisitStatus, SaturdayProgress>> = {
		registered: SaturdayProgress.awaitingDraw,
		waiting: SaturdayProgress.travelling,
		not_placed: SaturdayProgress.notPlaced,
	};

	/**
	 * The progress to show beside a visit, or `null` once the timeline has nothing left to tell — the
	 * guest is called, or the visit is finished. An unsuccessful draw keeps the skipped steps.
	 */
	static forVisit(status: VisitStatus): SaturdayProgress | null {
		return SaturdayProgress.byStatus[status] ?? null;
	}

	private constructor(
		readonly currentStep: number,
		readonly marker: SaturdayMarker | null,
		readonly shouldTryAgain = false,
	) {}

	stateOf(step: number, sessionStatus: SessionStatus | null = null): SaturdayStepState {
		if (
			(step === 2 || step === 3) &&
			(this.shouldTryAgain || (sessionStatus === 'service_started' && this.currentStep < 2))
		) {
			return 'skipped';
		}

		if (step < this.currentStep) {
			return 'past';
		}

		return step === this.currentStep ? 'current' : 'upcoming';
	}
}
