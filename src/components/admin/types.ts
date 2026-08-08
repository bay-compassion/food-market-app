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
	queuePosition: number | null;
	calledAt: string | null;
	status: VisitStatus;
};

/** What the manual guest form collects for a walk-in added during service. */
export type ManualGuest = {
	firstName: string;
	lastName: string;
	age: string | number;
	householdSize: string | number;
	phone: string;
	queuePlacement: 'next' | 'end';
};
