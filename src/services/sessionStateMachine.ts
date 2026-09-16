export type SessionStatus =
	| 'scheduled'
	| 'registration_open'
	| 'registration_closed'
	| 'lottery_pending'
	| 'service_started'
	| 'ended';

export enum SessionStatusEnum {
	SCHEDULED = 'scheduled',
	REGISTRATION_OPEN = 'registration_open',
	REGISTRATION_CLOSED = 'registration_closed',
	LOTTERY_PENDING = 'lottery_pending',
	SERVICE_STARTED = 'service_started',
	ENDED = 'ended',
}

/** Every status, in lifecycle order. */
export const sessionStatuses: SessionStatus[] = [
	SessionStatusEnum.SCHEDULED,
	SessionStatusEnum.REGISTRATION_OPEN,
	SessionStatusEnum.REGISTRATION_CLOSED,
	SessionStatusEnum.LOTTERY_PENDING,
	SessionStatusEnum.SERVICE_STARTED,
	SessionStatusEnum.ENDED,
];

export function isSessionStatus(value: unknown): value is SessionStatus {
	return sessionStatuses.includes(value as SessionStatus);
}

export type CurrentSessionState =
	| 'inactive'
	| 'scheduled'
	| 'registration_open'
	| 'registration_closed'
	| 'lottery_pending'
	| 'service_started';

export type SessionCommand =
	| 'open_registration'
	| 'postpone_registration'
	| 'update_registration'
	| 'close_registration'
	| 'reopen_registration'
	| 'pause_lottery'
	| 'postpone_lottery'
	| 'run_lottery'
	| 'close_session'
	| 'reset_session';

const commandSources: Record<SessionCommand, SessionStatus[]> = {
	open_registration: ['scheduled'],
	postpone_registration: ['scheduled'],
	update_registration: ['registration_open'],
	close_registration: ['registration_open'],
	reopen_registration: ['registration_closed'],
	pause_lottery: ['lottery_pending'],
	postpone_lottery: ['lottery_pending'],
	run_lottery: ['lottery_pending'],
	close_session: ['service_started'],
	// A session that never opened has nothing to reset; a pending one-off session is deleted instead.
	reset_session: ['registration_open', 'registration_closed', 'lottery_pending', 'service_started'],
};

const commandTargets: Partial<Record<SessionCommand, SessionStatus>> = {
	open_registration: 'registration_open',
	close_registration: 'registration_closed',
	reopen_registration: 'registration_open',
	run_lottery: 'service_started',
	close_session: 'ended',
	reset_session: 'ended',
};

export function currentSessionState(status?: SessionStatus): CurrentSessionState {
	if (
		status === 'scheduled' ||
		status === 'registration_open' ||
		status === 'registration_closed' ||
		status === 'lottery_pending' ||
		status === 'service_started'
	) {
		return status;
	}

	return 'inactive';
}

export function canRunSessionCommand(status: SessionStatus, command: SessionCommand) {
	return commandSources[command].includes(status);
}

export function sessionCommandTarget(command: SessionCommand) {
	return commandTargets[command] ?? null;
}
