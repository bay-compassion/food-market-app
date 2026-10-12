import type { GuestFormState } from '../components/types';
import type { VisitStatus } from './visitStateMachine';

/**
 * Guest-facing API calls, kept out of `GuestView` so its component stays about orchestrating
 * state rather than parsing responses.
 */

export type CurrentVisit = {
	id: string;
	marketEventId: string;
	status: VisitStatus;
	/** With `priorityNumber`, the guest's number — read it through `QueueNumber.of`. */
	queuePosition: number | null;
	priorityNumber: number | null;
	aheadOfYou: number | null;
	/** The highest main-series number called in this session; reported while waiting or called. */
	nowCalling: number | null;
	/**
	 * The main numbers called and not yet at the table, most recently called first; reported while
	 * waiting or called. Several at once when a worker calls a batch.
	 */
	called: number[];
	/** The priority numbers (`P1`, …) called and not yet at the table; reported while waiting or called. */
	calledPriority: number[];
};

export type GuestRegistrationInput = GuestFormState & {
	locale: string;
	marketEventId: string | null;
	answers: Record<string, string | number>;
	source: 'self';
};

export type GuestRegistrationPayload = GuestRegistrationInput & { deviceToken: string | null };

export type GuestRegistrationResult = {
	id: string;
	status: VisitStatus;
	visitToken: string;
	/** Present when the server establishes or replaces this browser's guest credential. */
	deviceToken?: string;
};

/** Submits a guest's registration. Throws if the server rejects it. */
export async function submitGuestRegistration(
	payload: GuestRegistrationPayload,
): Promise<GuestRegistrationResult> {
	const response = await fetch('/api/lottery-registration', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		throw new Error('Guest submission failed');
	}

	return (await response.json()) as GuestRegistrationResult;
}

export type GuestSignupInput = {
	firstName: string;
	lastName: string;
	phone: string;
	locale: string;
};

export type GuestSignupPayload = GuestSignupInput & { deviceToken: string | null };

export type GuestSignupResult = {
	guestId: string;
	/** Present when the server establishes or replaces this browser's guest credential. */
	deviceToken?: string;
};

/** Submits an identity-only sign-up: no session, no household data. Throws if the server rejects it. */
export async function submitGuestSignup(payload: GuestSignupPayload): Promise<GuestSignupResult> {
	const response = await fetch('/api/guest-information', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		throw new Error('Guest sign-up failed');
	}

	return (await response.json()) as GuestSignupResult;
}

/** What a phone receives for scanning a worker's QR code. */
export type GuestClaimResult = {
	deviceToken: string;
	identity: { firstName: string; lastName: string; phone: string };
	/** The guest's visit in today's session, when they have one. */
	visit: { id: string; marketEventId: string; status: VisitStatus; visitToken: string } | null;
};

/** Redeems a worker's single-use code. Throws if it is unknown, expired, or already used. */
export async function redeemGuestClaim(token: string): Promise<GuestClaimResult> {
	const response = await fetch('/api/guest-claim', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ token }),
	});

	if (!response.ok) {
		throw new Error('Guest claim failed');
	}

	return (await response.json()) as GuestClaimResult;
}

export type CurrentVisitLookup =
	| { found: true; visit: CurrentVisit }
	// The stored token no longer resolves to a visit — expired, ended, or otherwise unavailable.
	| { found: false; reason: 'expired' }
	// The request itself failed — say nothing about whether the visit still exists.
	| { found: false; reason: 'unreachable' };

/** Looks up the visit for a stored visit token. */
export async function fetchCurrentVisit(token: string): Promise<CurrentVisitLookup> {
	try {
		const response = await fetch('/api/visit', {
			headers: { Authorization: `Bearer ${token}` },
		});

		if (!response.ok) {
			return { found: false, reason: 'expired' };
		}

		const visit = (await response.json()) as Omit<
			CurrentVisit,
			'priorityNumber' | 'called' | 'calledPriority'
		> &
			Partial<Pick<CurrentVisit, 'priorityNumber' | 'called' | 'calledPriority'>>;

		// Defaults for the fields the priority series added, so a response that predates them (a
		// rollback, or a deploy still finishing) reads as "none" rather than as `undefined`.
		return {
			found: true,
			visit: { priorityNumber: null, called: [], calledPriority: [], ...visit },
		};
	} catch {
		return { found: false, reason: 'unreachable' };
	}
}

/** Cancels an in-progress visit. Throws if the server rejects it. */
export async function cancelCurrentVisit(
	token: string,
): Promise<{ id: string; status: VisitStatus }> {
	const response = await fetch('/api/visit', {
		method: 'PATCH',
		headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({ action: 'cancel' }),
	});

	if (!response.ok) {
		throw new Error('cancel');
	}

	return (await response.json()) as { id: string; status: VisitStatus };
}
