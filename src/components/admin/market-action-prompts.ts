import type { AdminTranslation } from '../../adminLocales';
import type { MarketAction } from '../../stores/admin.store';
import type { ConfirmationRequest } from '../../stores/confirmation.store';

/**
 * What a worker is asked before a session action they cannot undo from the same screen.
 *
 * Built from the session's state rather than taking it per lookup: closing names the guests it is
 * about to mark as a no show, and that count is the difference between a routine end-of-day step
 * and one worth stopping over.
 */
export class MarketActionPrompts {
	/** Actions that take something away, and so open with the way out focused. */
	static readonly destructive: readonly MarketAction[] = ['close_session', 'reset_session'];

	constructor(
		private readonly t: AdminTranslation,
		/** Guests still waiting or called, whom closing the session would mark as a no show. */
		private readonly outstandingCount: number,
	) {}

	for(action: MarketAction): ConfirmationRequest {
		const questions: Record<MarketAction, string> = {
			schedule_registration: this.t.confirmScheduleRegistration,
			open_registration: this.t.confirmOpenRegistration,
			close_registration: this.t.confirmCloseRegistration,
			reopen_registration: this.t.confirmReopenRegistration,
			run_lottery: this.t.confirmRunLottery,
			close_session: this.t.confirmCloseSession,
			reset_session: this.t.confirmResetSession,
		};

		return {
			question: questions[action],
			details: this.detailsFor(action),
			confirmLabel: this.t.confirmContinue,
			dismissLabel: this.t.cancel,
			destructive: MarketActionPrompts.destructive.includes(action),
		};
	}

	/** The consequences worth naming, for the two actions that have any. */
	private detailsFor(action: MarketAction): string[] | undefined {
		if (action === 'close_session' && this.outstandingCount > 0) {
			return [
				this.t.confirmCloseSessionOutstanding.replace('{count}', String(this.outstandingCount)),
			];
		}

		if (action === 'reset_session') {
			return [this.t.confirmResetSessionDetails];
		}

		return undefined;
	}
}
