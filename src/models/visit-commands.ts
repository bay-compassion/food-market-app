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
 * Which commands a worker may run on one visit. The state machine decides for the line; a premarket
 * volunteer is served from the start, which the state machine never leaves, so this adds the one
 * thing a worker can do to them: remove a visit that should not be there — a volunteer who
 * scanned a code they should not have had, say — by cancelling it.
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

	/** The commands to offer a worker. */
	get offered(): VisitCommand[] {
		return this.removesFromPremarket ? ['cancel'] : visitCommandsFrom(this.visit.status);
	}

	allows(command: VisitCommand): boolean {
		return (
			canRunVisitCommand(this.visit.status, command) ||
			(command === 'cancel' && this.removesFromPremarket)
		);
	}
}
