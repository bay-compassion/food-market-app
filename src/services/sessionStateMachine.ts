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

type SessionTiming = {
	status: SessionStatus;
	sessionMode: SessionMode;
	registrationOpensAt: Date;
	registrationClosesAt: Date;
	registrationGraceEndsAt?: Date | null;
};

export const registrationGracePeriodMs = 30_000;

export function registrationGraceDeadline(session: Pick<SessionTiming, 'registrationClosesAt'>) {
	return new Date(session.registrationClosesAt.valueOf() + registrationGracePeriodMs);
}

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

export function automaticSessionStatus(session: SessionTiming, now: Date): SessionStatus {
	const graceEndsAt = session.registrationGraceEndsAt ?? registrationGraceDeadline(session);

	if (session.status === 'scheduled' && session.registrationOpensAt <= now) {
		if (session.registrationClosesAt > now) {
			return 'registration_open';
		}

		return graceEndsAt <= now ? 'lottery_pending' : 'registration_closed';
	}

	if (session.status === 'registration_open' && session.registrationClosesAt <= now) {
		return graceEndsAt <= now ? 'lottery_pending' : 'registration_closed';
	}

	if (session.status === 'registration_closed' && graceEndsAt <= now) {
		return 'lottery_pending';
	}

	return session.status;
}

/** Whether a self-service request may still commit, including the brief post-close grace period. */
export function acceptsSelfRegistration(session: SessionTiming, now: Date) {
	const status = automaticSessionStatus(session, now);

	return status === 'registration_open' || status === 'registration_closed';
}

export function openingWindow(session: SessionTiming, now: Date) {
	const registrationClosesAt =
		session.sessionMode === 'scheduled'
			? new Date(
					now.valueOf() +
						(session.registrationClosesAt.valueOf() - session.registrationOpensAt.valueOf()),
				)
			: session.registrationClosesAt;

	return { registrationOpensAt: now, registrationClosesAt };
}

export function postponedWindow(session: SessionTiming, minutes: number) {
	const delay = minutes * 60_000;

	return {
		registrationOpensAt: new Date(session.registrationOpensAt.valueOf() + delay),
		registrationClosesAt: new Date(session.registrationClosesAt.valueOf() + delay),
	};
}
