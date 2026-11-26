/**
 * The quick filters above the guest database. "In session" and "not placed" read each guest's
 * latest visit against the session open now; "has notes" reads their whole record.
 *
 * A module of its own, with no imports, because the admin copy names each filter and is read by
 * scripts that must not pull in the guest database's row model.
 */
export const guestDatabaseFilters = ['all', 'in-session', 'not-placed', 'has-notes'] as const;

export type GuestDatabaseFilter = (typeof guestDatabaseFilters)[number];
