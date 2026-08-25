import type { MarketEventTiming } from './market-session.store';
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
	| { kind: 'not-open'; showPreregisterCta: boolean }
	| { kind: 'registration-closed' }
	| { kind: 'in-service' }
	| { kind: 'ended' };

/**
 * Decides which state the guest signup card is in. An active visit wins over everything else — a
 * guest who registered before the window closed should still see their queue status, not a
 * "registration closed" screen. Otherwise `phase` decides, mirroring the server-side gate in
 * `guestRegistration.mts`: a guest may self-register through `/signup` as soon as any event
 * exists, including `draft`, and only loses that ability once the window has genuinely passed.
 *
 * Takes `phase` rather than deriving it internally so a caller can substitute an optimistic
 * default (e.g. while `/api/market` hasn't loaded yet) without that policy leaking into this
 * function.
 */
export function resolveGuestCardState(options: {
	phase: SessionPhase;
	marketEvent: MarketEventTiming | null;
	isPreregistration: boolean;
	hasActiveVisit: boolean;
}): GuestCardState {
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
		case 'not-open': {
			const canPreregister = options.marketEvent !== null;
			if (options.isPreregistration && canPreregister) {
				return { kind: 'form', context: guestFormContext(phase) };
			}

			return { kind: 'not-open', showPreregisterCta: !options.isPreregistration && canPreregister };
		}
	}
}
