import type { SessionStatus } from './sessionStateMachine';
import { SessionStatusEnum } from './sessionStateMachine';
import type { VisitStatus } from './visitStateMachine';

/** Whether a current-market visit should take precedence over the session-level guest state. */
export function visitTakesPrecedence(
	sessionStatus: SessionStatus | null,
	visitStatus: VisitStatus | null,
): boolean {
	if (!visitStatus) {
		return false;
	}

	return !(sessionStatus === SessionStatusEnum.REGISTRATION_OPEN && visitStatus === 'cancelled');
}
