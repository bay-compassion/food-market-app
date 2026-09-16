export type SessionMode = 'scheduled' | 'ad_hoc';

export type SessionStatus =
	| 'draft'
	| 'scheduled'
	| 'registration_open'
	| 'registration_closed'
	| 'lottery_pending'
	| 'service_started'
	| 'ended';

export enum SessionStatusEnum {
	DRAFT = 'draft',
	SCHEDULED = 'scheduled',
	REGISTRATION_OPEN = 'registration_open',
	REGISTRATION_CLOSED = 'registration_closed',
	LOTTERY_PENDING = 'lottery_pending',
	SERVICE_STARTED = 'service_started',
	ENDED = 'ended',
}

/** Every status, in lifecycle order. */
export const sessionStatuses: SessionStatus[] = [
	SessionStatusEnum.DRAFT,
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
	| 'schedule_registration'
	| 'open_registration'
	| 'postpone_registration'
	| 'update_registration'
	| 'close_registration'
	| 'reopen_registration'
	| 'run_lottery'
	| 'close_session'
	| 'reset_session';

const commandSources: Record<SessionCommand, SessionStatus[]> = {
	schedule_registration: ['draft'],
	open_registration: ['draft', 'scheduled'],
	postpone_registration: ['scheduled'],
	update_registration: ['registration_open'],
	close_registration: ['registration_open'],
	reopen_registration: ['registration_closed'],
	run_lottery: ['lottery_pending'],
	close_session: ['service_started'],
	reset_session: [
		'draft',
		'scheduled',
		'registration_open',
		'registration_closed',
		'lottery_pending',
		'service_started',
	],
};

const commandTargets: Partial<Record<SessionCommand, SessionStatus>> = {
	schedule_registration: 'scheduled',
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

export function canRunSessionCommand(
	status: SessionStatus,
	command: SessionCommand,
	mode?: SessionMode,
) {
	return (
		commandSources[command].includes(status) &&
		(command !== 'schedule_registration' || mode === 'scheduled')
	);
}

export function sessionCommandTarget(command: SessionCommand) {
	return commandTargets[command] ?? null;
}
