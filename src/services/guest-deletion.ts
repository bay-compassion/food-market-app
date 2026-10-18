/**
 * What permanently deleting a guest would remove, as the server reports it before an admin
 * confirms. Shared by the Netlify function that answers and the dashboard dialog that shows it.
 */

/** Every table that holds a guest's data, in the order a deletion empties them. */
export const guestDataTables = [
	'visits',
	'visit_events',
	'notification_deliveries',
	'push_subscriptions',
	'sms_subscriptions',
	'sms_opt_outs',
	'guest_claims',
] as const;

export type GuestDataTable = (typeof guestDataTables)[number];

export type GuestDeletionPreview = {
	guestId: string;
	firstName: string;
	lastName: string;
	phone: string;
	/** When the guest record was created, as an ISO timestamp. */
	signedUpAt: string;
	/**
	 * Whether the guest has a visit in a session that has not ended. Deleting a visit out of a live
	 * queue or an undrawn lottery would leave both inconsistent, so the server refuses until it ends.
	 */
	inOpenSession: boolean;
	rows: Record<GuestDataTable, number>;
};
