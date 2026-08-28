import type { MarketEventTiming } from '../stores/market-session.store';
import { automaticSessionStatus } from './sessionStateMachine';

/**
 * Which of the session's lifecycle phases the guest signup card should react to. Collapses
 * `draft`/`scheduled`/no-event into `not-open` — the card treats "hasn't opened yet" as one thing
 * regardless of whether an admin has scheduled a time for it.
 */
export type SessionPhase =
	| 'not-open'
	| 'registration-open'
	| 'registration-closed'
	| 'in-service'
	| 'ended';

export function currentSessionPhase(
	marketEvent: MarketEventTiming | null,
	now: Date,
): SessionPhase {
	if (!marketEvent) {
		return 'not-open';
	}

	switch (automaticSessionStatus(marketEvent, now)) {
		case 'registration_open':
			return 'registration-open';
		case 'registration_closed':
			return 'registration-closed';
		case 'service_started':
			return 'in-service';
		case 'ended':
			return 'ended';
		default:
			return 'not-open';
	}
}

/**
 * Whether a guest is actually joining today's queue or signing up ahead of the window — decided
 * by whether registration is genuinely open right now, not by which route got them here (so a
 * guest who happens to still be on `/signup` once registration opens sees the ordinary queue
 * copy), and independent of whether they've already submitted (so their success screen keeps the
 * copy they signed up under after the window later opens or closes around them).
 */
export function guestFormContext(phase: SessionPhase): 'queue' | 'early' {
	return phase === 'registration-open' ? 'queue' : 'early';
}

export type GuestCardState =
	| { kind: 'visit-status' }
	| { kind: 'form'; context: 'queue' | 'early' }
	| { kind: 'not-open' }
	| { kind: 'registration-closed' }
	| { kind: 'in-service' }
	| { kind: 'ended' };

/**
 * Decides which state the guest signup card is in. A browser with no device credential may always
 * use `/signup` to establish its identity, even if it still has a visit token or today's session
 * is already underway. On the main route, an active visit wins over every session phase — a guest
 * who registered before the window closed should still see their queue status.
 *
 * Signing up (identity only) is decoupled from any session — `isIdentified` gates it instead of
 * whether a market event exists, so a guest can create their identity any time. Once identified,
 * there is nothing left to nudge them toward before registration opens.
 *
 * Takes `phase` rather than deriving it internally so a caller can substitute an optimistic
 * default (e.g. while `/api/market` hasn't loaded yet) without that policy leaking into this
 * function.
 */
export function resolveGuestCardState(options: {
	phase: SessionPhase;
	isPreregistration: boolean;
	isIdentified: boolean;
	hasActiveVisit: boolean;
}): GuestCardState {
	if (!options.isIdentified && options.isPreregistration) {
		return { kind: 'form', context: 'early' };
	}

	if (options.hasActiveVisit) {
		return { kind: 'visit-status' };
	}

	const { phase } = options;

	switch (phase) {
		case 'registration-open':
			return { kind: 'form', context: guestFormContext(phase) };
		case 'registration-closed':
			return { kind: 'registration-closed' };
		case 'in-service':
			return { kind: 'in-service' };
		case 'ended':
			return { kind: 'ended' };

		case 'not-open':
			return { kind: 'not-open' };
	}
}
