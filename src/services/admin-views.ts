import type { Permission } from './permissions.ts';

/**
 * The admin screens, in the order the navigation lists them. The route in `router.ts` matches the
 * same set — add a view here and the path pattern there has to grow with it.
 */
export const adminViews = [
	'current-session',
	'queue',
	'question-bank',
	'guest-database',
	'session-history',
	'reports',
	'dev-mode',
] as const;

export type AdminView = (typeof adminViews)[number];

export function isAdminView(value: unknown): value is AdminView {
	return adminViews.some((view) => view === value);
}

/**
 * What a worker needs to hold before a screen is worth offering them. Mirrors how the endpoints
 * behind each screen are gated in `netlify/functions/` — a screen whose data would come back 403
 * should not be in the navigation at all.
 */
export const viewPermissions: Record<AdminView, Permission> = {
	'current-session': 'manage:sessions',
	queue: 'run:queue',
	'question-bank': 'manage:sessions',
	'guest-database': 'run:queue',
	'session-history': 'run:queue',
	reports: 'read:reports',
	'dev-mode': 'manage:demo-data',
};

/** The screens a worker can open, in navigation order. */
export function viewsFor(granted: Permission[]): AdminView[] {
	return adminViews.filter((view) => granted.includes(viewPermissions[view]));
}
