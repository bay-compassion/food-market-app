import { z } from 'zod';

import type { PatternInput, SessionInput } from '../../src/services/schedule-payload.js';

/** ISO strings as the admin console sends them; a `Date` passes straight through for server callers. */
export const timestampSchema = z.union([z.string(), z.date()]).pipe(z.coerce.date());

/** Matches the `market_events_capacity_check` constraint in the database. */
export const capacitySchema = z.coerce.number().int().min(1).max(10_000);

export const questionSchema = z.object({
	prompt: z.string().trim().min(1).max(300),
	// A type the console does not recognise still has to render as something a guest can answer.
	type: z.enum(['text', 'scale']).catch('text'),
	required: z.boolean().catch(false),
});

/** A calendar date at the location, `YYYY-MM-DD`. */
const localDateSchema = z.iso.date();

/** A wall-clock time at the location, `HH:mm`. */
const localTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/** Matches the checks on `recurrence_patterns`, which sessions copy. */
const templateShape = {
	registrationOpensAt: localTimeSchema,
	registrationDurationMinutes: z.coerce.number().int().min(1).max(1440),
	capacity: capacitySchema,
	lotteryDelayMinutes: z.coerce.number().int().min(0).max(120).nullable(),
	autoCloseAfterMinutes: z.coerce.number().int().min(1).nullable(),
	questions: z.array(questionSchema).max(50),
};

/** Auto-close has to leave room for registration and the lottery before it ends the session. */
function autoCloseLeavesRoom(template: {
	registrationDurationMinutes: number;
	lotteryDelayMinutes: number | null;
	autoCloseAfterMinutes: number | null;
}) {
	return (
		template.autoCloseAfterMinutes === null ||
		template.autoCloseAfterMinutes >
			template.registrationDurationMinutes + (template.lotteryDelayMinutes ?? 0)
	);
}

const autoCloseError = {
	path: ['autoCloseAfterMinutes'],
	error: 'Auto-close must come after registration closes and the lottery draws.',
};

const patternSchema = z
	.object({ ...templateShape, startsOn: localDateSchema })
	.refine(autoCloseLeavesRoom, autoCloseError);

const sessionSchema = z
	.object({ ...templateShape, date: localDateSchema })
	.refine(autoCloseLeavesRoom, autoCloseError);

export function parsePatternInput(value: unknown): PatternInput | null {
	return patternSchema.safeParse(value).data ?? null;
}

export function parseSessionInput(value: unknown): SessionInput | null {
	return sessionSchema.safeParse(value).data ?? null;
}
