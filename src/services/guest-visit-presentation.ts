import type { SessionStatus } from './sessionStateMachine';
import { SessionStatusEnum } from './sessionStateMachine';
import type { VisitStatus } from './visitStateMachine';

/**
 * Whether a current-market visit should take precedence over the session-level guest state.
 *
 * That includes a session still `scheduled`: a premarket volunteer checks in on market day before
 * registration opens, and their phone should show them their visit, not that registration is
 * closed. A session that has ended, or none at all, has no visit left to show.
 */
export function visitTakesPrecedence(
	sessionStatus: SessionStatus | null,
	visitStatus: VisitStatus | null,
): boolean {
	if (!visitStatus || sessionStatus === null || sessionStatus === SessionStatusEnum.ENDED) {
		return false;
	}

	return !(sessionStatus === SessionStatusEnum.REGISTRATION_OPEN && visitStatus === 'cancelled');
}
