import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../../db/index.mjs';
import { marketEvents, registrationQuestions } from '../../db/schema.mjs';
import { tracedQuery } from '../lib/sentry.mjs';
import { getCurrentEvent, type ActionResult, type MarketEventRow } from './marketSession.mjs';
import { capacitySchema, timestampSchema } from './sessionInput.mjs';

const questionSchema = z.object({
	prompt: z.string().trim().min(1).max(300),
	// A type the console does not recognise still has to render as something a guest can answer.
	type: z.enum(['text', 'scale']).catch('text'),
	required: z.boolean().catch(false),
});

export type QuestionInput = z.infer<typeof questionSchema>;

const settingsSchema = z
	.object({
		registrationOpensAt: timestampSchema,
		registrationClosesAt: timestampSchema,
		capacity: capacitySchema,
		// A session is scheduled unless it explicitly says otherwise.
		sessionMode: z.enum(['ad_hoc', 'scheduled']).catch('scheduled'),
		questions: z.array(questionSchema),
	})
	.refine((settings) => settings.registrationClosesAt > settings.registrationOpensAt, {
		path: ['registrationClosesAt'],
		error: 'Registration must close after it opens.',
	});

export type ParsedSettings = z.infer<typeof settingsSchema>;

export function parseSettings(value: unknown): ParsedSettings | null {
	return settingsSchema.safeParse(value).data ?? null;
}

export async function saveSettings(settings: ParsedSettings): Promise<ActionResult> {
	const current = await getCurrentEvent();

	if (current && current.status !== 'draft') {
		return {
			ok: false,
			status: 409,
			error: 'Session settings can only be changed before registration opens.',
		};
	}
	const saved = await tracedQuery('market_session.save_settings', () =>
		db
			.transaction(async (tx) => {
				let event: MarketEventRow;

				if (current) {
					const [updated] = await tx
						.update(marketEvents)
						.set({
							registrationOpensAt: settings.registrationOpensAt,
							registrationClosesAt: settings.registrationClosesAt,
							capacity: settings.capacity,
							sessionMode: settings.sessionMode,
						})
						.where(and(eq(marketEvents.id, current.id), eq(marketEvents.status, 'draft')))
						.returning();

					if (!updated) {
						throw new Error('SESSION_SETTINGS_LOCKED');
					}
					await tx
						.delete(registrationQuestions)
						.where(eq(registrationQuestions.marketEventId, current.id));

					event = updated!;
				} else {
					const [created] = await tx
						.insert(marketEvents)
						.values({
							registrationOpensAt: settings.registrationOpensAt,
							registrationClosesAt: settings.registrationClosesAt,
							capacity: settings.capacity,
							sessionMode: settings.sessionMode,
						})
						.returning();

					event = created!;
				}

				if (settings.questions.length) {
					await tx.insert(registrationQuestions).values(
						settings.questions.map((question, position) => ({
							...question,
							position,
							marketEventId: event.id,
						})),
					);
				}
			})
			.catch((cause: unknown) => {
				if (cause instanceof Error && cause.message === 'SESSION_SETTINGS_LOCKED') {
					return false;
				}
				throw cause;
			}),
	);

	if (saved === false) {
		return {
			ok: false,
			status: 409,
			error: 'Session settings can only be changed before registration opens.',
		};
	}

	return { ok: true };
}
