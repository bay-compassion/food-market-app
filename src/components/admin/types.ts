import type { Locale } from '../../locales';
import type { GuestAdmission, QueuePlacement } from '../../services/guestAdmission';
import type { LotteryWeightTier } from '../../services/lotteryWeight';
import type { Permission } from '../../services/permissions';
import type { SessionMode, SessionStatus } from '../../services/sessionStateMachine';
import type { VisitStatus } from '../../services/visitStateMachine';

/**
 * Shapes shared between the admin components and their container.
 *
 * These live in a plain module rather than being exported from the `.vue` files that use them:
 * a type exported from `<script setup>` resolves through the wildcard `*.vue` shim in some of
 * this repo's TypeScript projects, so importing it fails under `oxlint` even though `vue-tsc`
 * accepts it.
 */

/** One visit as the queue screens render it. */
export type QueueGuest = {
	id: string;
	firstName: string;
	lastName: string;
	phone: string;
	householdSize: number;
	locale: Locale;
	queuePosition: number | null;
	calledAt: string | null;
	status: VisitStatus;
};

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
};

/** The screens a worker can open, in navigation order. */
export function viewsFor(granted: Permission[]) {
	return adminViews.filter((view) => granted.includes(viewPermissions[view]));
}

/** One registration question, as the question bank edits it. */
export type Question = {
	id?: string;
	prompt: string;
	type: 'text' | 'scale';
	required: boolean;
};

/** What the manual guest form collects for a guest a worker adds by hand. */
export type ManualGuest = {
	firstName: string;
	lastName: string;
	age: string | number;
	householdSize: string | number;
	phone: string;
	queuePlacement: QueuePlacement;
	admission: GuestAdmission;
	lotteryWeightTier: LotteryWeightTier;
};

/** The market event as the admin screens render it. */
export type AdminMarketEvent = {
	id: string;
	registrationOpensAt: string;
	registrationClosesAt: string;
	capacity: number;
	sessionMode: SessionMode;
	status: SessionStatus;
};

/** The registration settings the session view edits before a session opens. */
export type SessionSettings = {
	sessionMode: SessionMode;
	registrationOpensAt: string;
	adHocClosesAt: string;
	durationMinutes: number;
	capacity: number;
};

/** A finished session as the history view renders it. */
export type HistoricalEvent = AdminMarketEvent & { guestCount: number };
