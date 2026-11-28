import type { VisitTrack } from '../services/visit-track.ts';
import {
	canRunVisitCommand,
	visitCommandsFrom,
	type VisitCommand,
	type VisitStatus,
} from '../services/visitStateMachine.ts';

/** What a command needs to know about a visit: where it stands, and how it takes part. */
export type CommandableVisit = { status: VisitStatus; track: VisitTrack };

/**
 * Which commands a worker may run on one visit. The state machine decides for the line, with two
 * tracks that bend it:
 *
 * - A premarket volunteer is served from the start, which the state machine never leaves, so this
 *   adds the one thing a worker can do to them: remove a visit that should not be there — a
 *   volunteer who scanned a code they should not have had, say — by cancelling it.
 * - A standby guest is never marked a no-show. One who doesn't come up when called, or who leaves,
 *   is cancelled by the worker instead, from the list or once called.
 *
 * Shared by the server, which enforces it, and the dashboard and queue desk, which offer only what
 * it allows.
 */
export class VisitCommands {
	constructor(private readonly visit: CommandableVisit) {}

	/** Whether this is a premarket volunteer a worker can still remove. */
	get removesFromPremarket(): boolean {
		return this.visit.track === 'premarket' && this.visit.status === 'served';
	}

	/** Whether this is a standby guest a worker can still take off the list. */
	get cancelsFromStandby(): boolean {
		return (
			this.visit.track === 'postmarket' &&
			(this.visit.status === 'waiting' || this.visit.status === 'called')
		);
	}

	/**
	 * Whether calling this guest texts and pushes them. Standby guests are admitted at the desk by
	 * name, quickly, so they aren't.
	 */
	get notifiesWhenCalled(): boolean {
		return this.visit.track !== 'postmarket';
	}

	/**
	 * Whether a returned guest takes a place in the line. A standby guest is ordered by their S
	 * number alone, so going back to `waiting` puts them back on the list where they were.
	 */
	get returnsToAPlaceInLine(): boolean {
		return this.visit.track !== 'postmarket';
	}

	/** The commands to offer a worker. */
	get offered(): VisitCommand[] {
		if (this.removesFromPremarket) {
			return ['cancel'];
		}

		const fromStatus = visitCommandsFrom(this.visit.status);

		if (this.visit.track !== 'postmarket') {
			return fromStatus;
		}

		const offered = fromStatus.filter((command) => command !== 'mark_no_show');

		return this.cancelsFromStandby ? [...offered, 'cancel'] : offered;
	}

	allows(command: VisitCommand): boolean {
		if (command === 'cancel' && (this.removesFromPremarket || this.cancelsFromStandby)) {
			return true;
		}

		if (command === 'mark_no_show' && this.visit.track === 'postmarket') {
			return false;
		}

		return canRunVisitCommand(this.visit.status, command);
	}
}
