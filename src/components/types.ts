import type { AgeRange } from '../services/ageRanges';

/**
 * Shapes shared between guest-facing components and their container.
 *
 * Lives in a plain module rather than being exported from a `.vue` file: a type exported from
 * `<script setup>` resolves through the wildcard `*.vue` shim in some of this repo's TypeScript
 * projects, so importing it fails under `oxlint` even though `vue-tsc` accepts it.
 */

/** What the guest signup form collects, before submission coerces the numeric fields. */
export type GuestFormState = {
	firstName: string;
	lastName: string;
	ageRange: AgeRange | '';
	householdSize: number | string;
	childrenCount: number | string;
	seniorsCount: number | string;
	phone: string;
};
