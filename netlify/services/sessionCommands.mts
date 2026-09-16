import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../../db/index.mjs';
import { marketEvents, visits } from '../../db/schema.mjs';
import { SessionTimeline } from '../../src/models/session-timeline.js';
import {
	canRunSessionCommand,
	sessionCommandTarget,
} from '../../src/services/sessionStateMachine.js';
import { tracedQuery } from '../lib/sentry.mjs';
import { scheduleRegistrationClose } from './marketLifecycleEvents.mjs';
import type { ActionResult, MarketEventRow } from './marketSession.mjs';
import { queueNotification } from './notifications.mjs';
import { notificationsEnabled } from './pushNotifications.mjs';
import { endSession } from './sessionEnding.mjs';
import { capacitySchema, timestampSchema } from './sessionInput.mjs';

/** What a worker can still change once registration is open: how long, and for how many. */
const registrationOverrideSchema = z.object({
	registrationClosesAt: timestampSchema,
	capacity: capacitySchema,
});

export function parseRegistrationOverride(value: unknown) {
	return registrationOverrideSchema.safeParse(value).data ?? null;
}

/** A scheduled session can slip by up to a day; anything longer should be rescheduled instead. */
const postponementSchema = z.object({ minutes: z.coerce.number().int().min(1).max(1440) });

export async function resetSession(event: MarketEventRow): Promise<ActionResult> {
	if (!canRunSessionCommand(event.status, 'reset_session')) {
		return { ok: false, status: 409, error: 'The current session could not be reset.' };
	}

	const { ended } = await tracedQuery('market_session.reset', () =>
		db.transaction((tx) => endSession(tx, event, 'reset')),
	);

	if (!ended) {
		return { ok: false, status: 409, error: 'The current session could not be reset.' };
	}

	return { ok: true };
}

export async function updateRegistration(
	event: MarketEventRow,
	body: unknown,
): Promise<ActionResult> {
	const override = parseRegistrationOverride(body);

	if (
		!canRunSessionCommand(event.status, 'update_registration') ||
		!override ||
		override.registrationClosesAt < event.registrationClosesAt ||
		override.registrationClosesAt <= event.registrationOpensAt
	) {
		return { ok: false, status: 400, error: 'Please provide valid registration overrides.' };
	}
	const [updated] = await tracedQuery('market_session.update_registration', () =>
		db
			.update(marketEvents)
			.set(override)
			.where(and(eq(marketEvents.id, event.id), eq(marketEvents.status, 'registration_open')))
			.returning({ id: marketEvents.id, registrationClosesAt: marketEvents.registrationClosesAt }),
	);

	if (!updated) {
		return {
			ok: false,
			status: 409,
			error: 'Registration overrides are only available while registration is open.',
		};
	}

	await scheduleRegistrationClose(updated);

	return { ok: true };
}

export async function postponeRegistration(
	event: MarketEventRow,
	body: unknown,
): Promise<ActionResult> {
	const postponement = postponementSchema.safeParse(body);

	if (!canRunSessionCommand(event.status, 'postpone_registration') || !postponement.success) {
		return {
			ok: false,
			status: 409,
			error: 'A scheduled session can only be postponed by a valid number of minutes.',
		};
	}
	const [updated] = await tracedQuery('market_session.postpone_registration', () =>
		db
			.update(marketEvents)
			.set(new SessionTimeline(event).postponedWindow(postponement.data.minutes))
			.where(and(eq(marketEvents.id, event.id), eq(marketEvents.status, 'scheduled')))
			.returning({ id: marketEvents.id, registrationClosesAt: marketEvents.registrationClosesAt }),
	);

	if (!updated) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}

	await scheduleRegistrationClose(updated);

	return { ok: true };
}

export async function openRegistration(event: MarketEventRow): Promise<ActionResult> {
	const target = sessionCommandTarget('open_registration');

	if (!target || !canRunSessionCommand(event.status, 'open_registration')) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}
	const now = new Date();
	const window = new SessionTimeline(event).openingWindow(now);
	const { registrationClosesAt } = window;

	if (registrationClosesAt <= now) {
		return { ok: false, status: 409, error: 'Registration must close in the future.' };
	}
	const [updated] = await tracedQuery('market_session.open_registration', () =>
		db
			.update(marketEvents)
			.set({ status: target, registrationGraceEndsAt: null, ...window })
			.where(and(eq(marketEvents.id, event.id), eq(marketEvents.status, 'scheduled')))
			.returning({ id: marketEvents.id, registrationClosesAt: marketEvents.registrationClosesAt }),
	);

	if (!updated) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}

	await scheduleRegistrationClose(updated);

	return { ok: true };
}

export async function reopenRegistration(event: MarketEventRow): Promise<ActionResult> {
	const target = sessionCommandTarget('reopen_registration');

	if (!target || !canRunSessionCommand(event.status, 'reopen_registration')) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}
	const minimumClose = new Date(Date.now() + 30 * 60_000);
	const [updated] = await tracedQuery('market_session.reopen_registration', () =>
		db
			.update(marketEvents)
			.set({
				status: target,
				registrationGraceEndsAt: null,
				registrationClosesAt:
					event.registrationClosesAt > minimumClose ? event.registrationClosesAt : minimumClose,
			})
			.where(and(eq(marketEvents.id, event.id), eq(marketEvents.status, 'registration_closed')))
			.returning({ id: marketEvents.id, registrationClosesAt: marketEvents.registrationClosesAt }),
	);

	if (!updated) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}

	await scheduleRegistrationClose(updated);

	return { ok: true };
}

export async function closeSession(event: MarketEventRow): Promise<ActionResult> {
	if (!canRunSessionCommand(event.status, 'close_session')) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}

	const { ended } = await tracedQuery('market_session.close_session', () =>
		db.transaction((tx) => endSession(tx, event, 'close')),
	);

	if (!ended) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}

	return { ok: true };
}

export async function closeRegistration(event: MarketEventRow): Promise<ActionResult> {
	const target = sessionCommandTarget('close_registration');

	if (!target || !canRunSessionCommand(event.status, 'close_registration')) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}
	const closed = await tracedQuery('market_session.close_registration', () =>
		db.transaction(async (tx) => {
			const registrationGraceEndsAt = SessionTimeline.graceDeadlineAfter(new Date());
			const [updated] = await tx
				.update(marketEvents)
				.set({ status: target, registrationGraceEndsAt })
				.where(and(eq(marketEvents.id, event.id), eq(marketEvents.status, event.status)))
				.returning({ id: marketEvents.id });

			if (!updated) {
				return false;
			}

			if (notificationsEnabled()) {
				const registrations = await tx
					.select({ visitId: visits.id })
					.from(visits)
					.where(and(eq(visits.marketEventId, event.id), eq(visits.status, 'registered')));

				await queueNotification(
					tx,
					registrations.map(({ visitId }) => visitId),
					'registration_closed',
					'registration_closed',
				);
			}

			return true;
		}),
	);

	if (!closed) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}

	return { ok: true };
}
