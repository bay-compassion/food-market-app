export type VisitStatus =
	| 'registered'
	| 'waiting'
	| 'called'
	| 'served'
	| 'not_placed'
	| 'no_show'
	| 'cancelled';

export type VisitCommand =
	| 'select'
	| 'skip'
	| 'call'
	| 'serve'
	| 'mark_no_show'
	| 'return_to_queue'
	| 'cancel';

export const visitCommands: VisitCommand[] = [
	'select',
	'skip',
	'call',
	'serve',
	'mark_no_show',
	'return_to_queue',
	'cancel',
];

export const visitStatuses: VisitStatus[] = [
	'registered',
	'waiting',
	'called',
	'served',
	'not_placed',
	'no_show',
	'cancelled',
];

/** Statuses that still need a worker's attention while service is running. */
export const outstandingVisitStatuses: VisitStatus[] = ['waiting', 'called'];

const commandSources: Record<VisitCommand, VisitStatus[]> = {
	select: ['registered'],
	skip: ['registered'],
	call: ['waiting'],
	serve: ['called'],
	mark_no_show: ['waiting', 'called'],
	return_to_queue: ['called', 'no_show'],
	cancel: ['registered', 'waiting'],
};

const commandTargets: Record<VisitCommand, VisitStatus> = {
	select: 'waiting',
	skip: 'not_placed',
	call: 'called',
	serve: 'served',
	mark_no_show: 'no_show',
	return_to_queue: 'waiting',
	cancel: 'cancelled',
};

/**
 * Commands a worker may run themselves. `select` and `skip` are owned by the lottery
 * (see `runLottery` in `netlify/services/marketSession.ts`) and `cancel` by the guest
 * (`netlify/functions/visit.ts`), so neither is offered in the admin UI.
 */
const workerCommands: VisitCommand[] = ['call', 'serve', 'mark_no_show', 'return_to_queue'];

export function canRunVisitCommand(status: VisitStatus, command: VisitCommand) {
	return commandSources[command].includes(status);
}

export function visitCommandTarget(command: VisitCommand) {
	return commandTargets[command];
}

export function visitCommandsFrom(status: VisitStatus) {
	return workerCommands.filter((command) => canRunVisitCommand(status, command));
}

export function isVisitStatus(value: unknown): value is VisitStatus {
	return visitStatuses.some((status) => status === value);
}

export function isVisitCommand(value: unknown): value is VisitCommand {
	return visitCommands.some((command) => command === value);
}
