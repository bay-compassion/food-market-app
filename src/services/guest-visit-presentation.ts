import type { SessionStatus } from './sessionStateMachine';
import { SessionStatusEnum } from './sessionStateMachine';
import type { VisitStatus } from './visitStateMachine';

/**
 * Whether a current-market visit should take precedence over the session-level guest state.
 *
 * That includes a session still `scheduled`: a premarket volunteer checks in on market day before
 * registration opens, and their phone should show them their visit, not that registration is
 * closed. Only a visit to that very session counts there — the next week's session is `scheduled`
 * the moment the last one ends, and a phone may still hold last week's visit until it next hears
 * from the server. A session that has ended, or none at all, has no visit left to show.
 */
export function visitTakesPrecedence(
	sessionStatus: SessionStatus | null,
	visitStatus: VisitStatus | null,
	isThisSessionsVisit = true,
): boolean {
	if (!visitStatus || sessionStatus === null || sessionStatus === SessionStatusEnum.ENDED) {
		return false;
	}

	if (sessionStatus === SessionStatusEnum.SCHEDULED && !isThisSessionsVisit) {
		return false;
	}

	return !(sessionStatus === SessionStatusEnum.REGISTRATION_OPEN && visitStatus === 'cancelled');
}
