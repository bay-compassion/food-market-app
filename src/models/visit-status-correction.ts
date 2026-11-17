import { finishedVisitStatuses, type VisitStatus } from '../services/visitStateMachine.ts';

/**
 * Setting the status a visit in an ended session should have had, when it was not recorded
 * correctly on the day — a guest who was served but never marked, or marked a no-show by mistake.
 *
 * Deliberately not a `VisitCommand`: the state machine describes what a worker may do while the
 * queue runs, and reconciling afterwards needs moves it refuses, such as `no_show` → `served`.
 * Only the finished statuses are offered, because once a session has ended nobody is left in line
 * to be waiting or called. Shared by the server, which enforces it, and the dashboard, which offers
 * only what it allows.
 */
export class VisitStatusCorrection {
	/** Every status a correction can set. */
	static readonly targets: readonly VisitStatus[] = finishedVisitStatuses;

	constructor(private readonly from: VisitStatus) {}

	/** The statuses this visit can be corrected to: every finished one but its own. */
	get targets(): VisitStatus[] {
		return VisitStatusCorrection.targets.filter((status) => status !== this.from);
	}

	allows(to: VisitStatus): boolean {
		return this.targets.includes(to);
	}

	/**
	 * The columns a correction to `to` writes besides the status. `served_at` is when service
	 * finished, which nobody recorded for a visit corrected to `served`, so it stays empty — the
	 * reports already count such visits as having no timing. A visit corrected away from `served`
	 * was never served, so it loses the time it carried. `called_at` is left alone: the guest was
	 * either called that day or not, whatever happened next.
	 */
	changes(to: VisitStatus): { status: VisitStatus; servedAt?: null } {
		return this.from === 'served' ? { status: to, servedAt: null } : { status: to };
	}
}
