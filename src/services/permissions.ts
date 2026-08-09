/**
 * What a signed-in worker is allowed to do.
 *
 * These are Auth0 API permissions, defined in the Auth0 dashboard and bundled into roles there —
 * see [`docs/roles.md`](../../docs/roles.md). Auth0 puts the ones a user holds into the
 * `permissions` claim of their access token, which the server reads on every admin request.
 *
 * Shared between the browser and the Netlify functions so both name them identically. The browser
 * uses them to hide what a worker cannot use; the server uses them to enforce it. Only the server
 * side is security — a hidden button is a courtesy, not a lock.
 */

export const permissions = [
	/** Run the queue: call guests, change a visit's status, add a guest, close the day's session. */
	'run:queue',
	/** Set a session up and steer it: settings, questions, registration lifecycle, broadcasts. */
	'manage:sessions',
	/** Read the reports. Counts and rates only — these never name a guest. */
	'read:reports',
	/** Download the visit export, which carries guest names and phone numbers. */
	'export:guest-data',
] as const;

export type Permission = (typeof permissions)[number];

export function isPermission(value: unknown): value is Permission {
	return permissions.some((permission) => permission === value);
}

/**
 * The permissions in a token's `permissions` claim, ignoring anything unrecognised.
 *
 * A token with no claim at all yields none. That is the correct reading — a user Auth0 has not
 * given a role holds no permissions — but it is also what a misconfigured tenant looks like, so
 * see the rollout order in `docs/roles.md` before turning enforcement on.
 */
export function grantedPermissions(claim: unknown): Permission[] {
	return Array.isArray(claim) ? claim.filter(isPermission) : [];
}

export function hasPermission(granted: Permission[], permission: Permission) {
	return granted.includes(permission);
}
