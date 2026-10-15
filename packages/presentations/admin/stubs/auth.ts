/**
 * Stands in for `src/auth.ts` in the admin frame, which signs nobody in. The dashboard is shown as
 * a market coordinator sees it: every screen of the session's lifecycle and its records, without
 * the demo-data tools (granted to nobody by default) or the guest-data export.
 */
import type { Permission } from '../../../../src/services/permissions.ts';

/** The real module builds this from the page's origin as it loads; a file has none. */
export const authReturnUrl = '/';

/** "Configured", so the dashboard reads the coordinator's permissions rather than every one. */
export const isAuth0Configured = true;

const coordinator: Permission[] = ['run:queue', 'manage:sessions', 'read:reports'];

export function permissionsFromToken(): Permission[] {
	return [...coordinator];
}

export function everyPermission(): Permission[] {
	return [...coordinator];
}
