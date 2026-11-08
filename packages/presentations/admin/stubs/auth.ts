/**
 * Stands in for `src/auth.ts` in the admin frame, which signs nobody in. The dashboard is shown as
 * the scene's role sees it (`docs/roles.md`), without the demo-data tools (granted to nobody by
 * default):
 *
 * - a market coordinator: every screen of the session's lifecycle and its records, including the
 *   guest database that `export:guest-data` opens;
 * - a team leader: the same day-to-day screens, but no guest database, since `export:guest-data`
 *   gates every read across sessions.
 *
 * The frame names the role before it mounts a dashboard (`signInAs`), and the dashboard reads it
 * once, as it reads a token's permissions once.
 */
import type { Permission } from '../../../../src/services/permissions.ts';
import type { AdminRole } from '../scene.ts';

/** The real module builds this from the page's origin as it loads; a file has none. */
export const authReturnUrl = '/';

/** "Configured", so the dashboard reads the role's permissions rather than every one. */
export const isAuth0Configured = true;

const permissions: Record<AdminRole, Permission[]> = {
	coordinator: ['run:queue', 'manage:sessions', 'read:reports', 'export:guest-data'],
	// As `infrastructure/auth0/tenant/tenant.yaml` grants the role.
	'team-leader': [
		'run:queue',
		'manage:sessions',
		'manage:guest-access',
		'read:reports',
		'print:name-tags',
	],
};

let role: AdminRole = 'coordinator';

/** Who the next dashboard the frame mounts is signed in as. */
export function signInAs(next: AdminRole): void {
	role = next;
}

export function permissionsFromToken(): Permission[] {
	return [...permissions[role]];
}

export function everyPermission(): Permission[] {
	return [...permissions[role]];
}
