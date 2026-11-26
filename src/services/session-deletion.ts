import type { SnapshotKind } from '../models/snapshot-schedule.ts';

/**
 * What permanently deleting a finished session would remove, as the server reports it before a
 * data steward confirms. Shared by the Netlify function that answers and the dashboard dialog that
 * shows it. The deletion is for a session run as a test, so that it never reaches the reports.
 */

/** Every table a session deletion empties rows from, in the order it empties them. */
export const sessionDataTables = [
	'household_service_entries',
	'visits',
	'visit_events',
	'notification_deliveries',
	'push_subscriptions',
	'guests',
	'registration_questions',
	'lottery_odds_changes',
	'guest_notes',
] as const;

export type SessionDataTable = (typeof sessionDataTables)[number];

/** A frozen warehouse snapshot whose numbers include the session: its own, or a period's. */
export type CoveringSnapshot = {
	id: string;
	kind: SnapshotKind;
	periodStart: string;
	periodEnd: string;
	revision: number;
};

/** A guest whose only visits were in this session, and who is deleted with it. */
export type SessionOnlyGuest = { guestId: string; firstName: string; lastName: string };

/** Why the server will not delete this session. */
export type SessionDeletionBlock =
	/** Deleting visits out of a live queue or an undrawn lottery would leave both inconsistent. */
	| 'not-ended'
	/**
	 * The warehouse has frozen numbers that include it. Deleting it anyway needs `force`, which
	 * removes those snapshots too, so the warehouse never counts a session that no longer exists.
	 */
	| 'warehoused';

export type SessionDeletionPreview = {
	marketEventId: string;
	registrationOpensAt: string;
	registrationClosesAt: string;
	/**
	 * The session's date and opening time at the market, `YYYY-MM-DD HH:mm`, which the steward types
	 * to confirm. The time tells apart two sessions on one day, such as a morning test run before the
	 * afternoon's market. A fixed format rather than a localized one, so it compares exactly.
	 */
	confirmation: string;
	blockedBy: SessionDeletionBlock | null;
	/** The snapshots a forced deletion removes, oldest period first. Empty unless `warehoused`. */
	coveringSnapshots: CoveringSnapshot[];
	/** Guests deleted along with the session, by name, so a real person among them is caught. */
	sessionOnlyGuests: SessionOnlyGuest[];
	/** Guests who also came to other sessions: they keep their record and lose only this visit. */
	keptGuests: number;
	rows: Record<SessionDataTable, number>;
};

/**
 * Whether what the steward typed is the session's confirmation. Runs of spaces count as one, so a
 * stray double space does not hold the button back; anything else must match exactly. Shared by the
 * dialog and the server so the two cannot disagree.
 */
export function matchesSessionConfirmation(typed: string, confirmation: string): boolean {
	return typed.trim().replace(/\s+/g, ' ') === confirmation;
}
