import type { Permission } from './permissions.ts';

/**
 * The admin screens, in navigation order: grouped as `adminViewGroup` heads them, so a list that
 * follows this order never splits a group. AdminAuthView validates route parameters against this set.
 */
export const adminViews = [
	'checklist',
	'current-session',
	'queue',
	'broadcast',
	'schedule',
	'question-bank',
	'guest-database',
	'session-history',
	'reports',
	'workers',
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
	checklist: 'manage:sessions',
	'current-session': 'manage:sessions',
	schedule: 'manage:sessions',
	queue: 'run:queue',
	broadcast: 'manage:sessions',
	'question-bank': 'manage:sessions',
	'guest-database': 'run:queue',
	'session-history': 'run:queue',
	reports: 'read:reports',
	workers: 'manage:workers',
	'dev-mode': 'manage:demo-data',
};

/** The screens a worker can open, in navigation order. */
export function viewsFor(granted: Permission[]): AdminView[] {
	return adminViews.filter((view) => granted.includes(viewPermissions[view]));
}

/** The headings the navigation sorts screens under, in the order they appear. */
export const adminViewGroups = ['today', 'plan', 'records'] as const;

export type AdminViewGroup = (typeof adminViewGroups)[number];

/**
 * Which heading each screen sits under. Dev Mode belongs to none: it is a tool for staging the
 * market, not part of running one, so it trails the list on its own.
 */
export const adminViewGroup: Record<AdminView, AdminViewGroup | null> = {
	checklist: 'today',
	'current-session': 'today',
	queue: 'today',
	broadcast: 'today',
	schedule: 'plan',
	'question-bank': 'plan',
	'guest-database': 'records',
	'session-history': 'records',
	reports: 'records',
	workers: null,
	'dev-mode': null,
};
