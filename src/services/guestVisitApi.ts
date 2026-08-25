import type { GuestFormState } from '../components/types';
import type { VisitStatus } from './visitStateMachine';

/**
 * The guest-facing `/api/guests` and `/api/visit` calls, kept out of `GuestView` so its component
 * stays about orchestrating state rather than parsing responses.
 */

export type ActiveVisit = {
	id: string;
	status: VisitStatus;
	queuePosition: number | null;
	aheadOfYou: number | null;
};

export type GuestRegistrationPayload = GuestFormState & {
	locale: string;
	marketEventId: string | null;
	answers: Record<string, string | number>;
	source: 'self';
	registrationType: 'new' | 'returning';
	pin: string;
	updateProfile: boolean;
};

export type GuestRegistrationResult = {
	id: string;
	status: VisitStatus;
	visitToken: string;
};

/** Submits a guest's registration. Throws if the server rejects it. */
export async function submitGuestRegistration(
	payload: GuestRegistrationPayload,
): Promise<GuestRegistrationResult> {
	const response = await fetch('/api/guests', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
	if (!response.ok) {
		throw new Error('Guest submission failed');
	}

	return (await response.json()) as GuestRegistrationResult;
}

export type ActiveVisitLookup =
	| { found: true; visit: ActiveVisit }
	// The stored token no longer resolves to a visit — cancelled, expired, or from a prior session.
	| { found: false; reason: 'expired' }
	// The request itself failed — say nothing about whether the visit still exists.
	| { found: false; reason: 'unreachable' };

/** Looks up the visit for a stored visit token. */
export async function fetchActiveVisit(token: string): Promise<ActiveVisitLookup> {
	try {
		const response = await fetch('/api/visit', {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!response.ok) {
			return { found: false, reason: 'expired' };
		}

		return { found: true, visit: (await response.json()) as ActiveVisit };
	} catch {
		return { found: false, reason: 'unreachable' };
	}
}

/** Cancels an in-progress visit. Throws if the server rejects it. */
export async function cancelActiveVisit(
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
