import type { SessionTiming } from './session-timeline.ts';

/**
 * What the guest's countdown strip shows at one moment. Each phase looks different, so the clock
 * counting down to opening is never mistaken for the one counting down to closing.
 */
export type RegistrationClockPhase =
	| { kind: 'hidden' }
	/** The last minutes before registration opens, counting down to it. */
	| { kind: 'opens'; remainingMs: number }
	/** Opening time has come on this device, but the server has not yet said registration is open. */
	| { kind: 'opening' }
	/** Registration has just opened: a moment of its own, between the two countdowns. */
	| { kind: 'opened' }
	/** Registration is open, counting down to its closing; `progress` is how far it has warmed. */
	| { kind: 'closes'; remainingMs: number; progress: number };

/**
 * The guest's registration clock: which phase of the strip a session is in at a given moment.
 *
 * Built from the session's status and window rather than from when a screen happened to mount, so
 * a reload, a guide seeking straight to a moment, or Start Now (which moves the opening time to the
 * moment it is pressed) all land in the same phase.
 */
export class RegistrationClock {
	/** How long before registration opens the strip appears to count down to it. */
	static readonly openingLeadMs = 10 * 60_000;
	/** How long "Registration is open" holds before the closing countdown takes over. */
	static readonly openedHoldMs = 10_000;
	/** How long before closing the strip starts warming toward the danger color. */
	static readonly warmingMs = 5 * 60_000;

	constructor(
		private readonly session: Pick<
			SessionTiming,
			'status' | 'registrationOpensAt' | 'registrationClosesAt'
		>,
	) {}

	phaseAt(now: number): RegistrationClockPhase {
		const { status, registrationOpensAt, registrationClosesAt } = this.session;

		if (status === 'scheduled') {
			const remainingMs = registrationOpensAt.valueOf() - now;

			if (remainingMs > RegistrationClock.openingLeadMs) {
				return { kind: 'hidden' };
			}

			return remainingMs > 0 ? { kind: 'opens', remainingMs } : { kind: 'opening' };
		}

		if (status !== 'registration_open') {
			return { kind: 'hidden' };
		}

		// A device clock running behind the server's reads a negative time since opening, which is
		// still "just opened".
		if (now - registrationOpensAt.valueOf() < RegistrationClock.openedHoldMs) {
			return { kind: 'opened' };
		}

		const remainingMs = registrationClosesAt.valueOf() - now;

		if (remainingMs <= 0) {
			return { kind: 'hidden' };
		}

		return {
			kind: 'closes',
			remainingMs,
			progress: Math.min(1, Math.max(0, 1 - remainingMs / RegistrationClock.warmingMs)),
		};
	}
}
