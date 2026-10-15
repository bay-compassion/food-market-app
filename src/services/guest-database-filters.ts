/**
 * The quick filters above the guest database. Today's visits are the only visits the list carries.
 *
 * A module of its own, with no imports, because the admin copy names each filter and is read by
 * scripts that must not pull in the guest database's row model.
 */
export const guestDatabaseFilters = ['all', 'in-session', 'not-placed'] as const;

export type GuestDatabaseFilter = (typeof guestDatabaseFilters)[number];
