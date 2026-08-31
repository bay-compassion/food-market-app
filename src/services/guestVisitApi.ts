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
	queuePosition: number | null;
	aheadOfYou: number | null;
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

export type CurrentVisitLookup =
	| { found: true; visit: CurrentVisit }
	// The stored token no longer resolves to a visit — cancelled, expired, or from a prior session.
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

		return { found: true, visit: (await response.json()) as CurrentVisit };
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
