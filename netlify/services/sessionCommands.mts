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
import type { ActionResult, MarketEventRow } from './marketSession.mjs';
import { queueNotification } from './notifications.mjs';
import { notificationsEnabled } from './pushNotifications.mjs';
import { endSession } from './sessionEnding.mjs';
import { capacitySchema, timestampSchema } from './sessionInput.mjs';
import { scheduleSessionTimers, upcomingSessionTimers } from './sessionTimers.mjs';

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

	const autoClosesAt = new SessionTimeline(event).autoClosesAt;

	if (autoClosesAt && override.registrationClosesAt >= autoClosesAt) {
		return {
			ok: false,
			status: 400,
			error: 'Registration cannot close after the session closes automatically.',
		};
	}
	const [updated] = await tracedQuery('market_session.update_registration', () =>
		db
			.update(marketEvents)
			.set(override)
			.where(and(eq(marketEvents.id, event.id), eq(marketEvents.status, 'registration_open')))
			.returning(),
	);

	if (!updated) {
		return {
			ok: false,
			status: 409,
			error: 'Registration overrides are only available while registration is open.',
		};
	}

	await scheduleSessionTimers(updated, ['registration_close']);

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
			.returning(),
	);

	if (!updated) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}

	await scheduleSessionTimers(updated, upcomingSessionTimers);

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
			.returning(),
	);

	if (!updated) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}

	await scheduleSessionTimers(updated, upcomingSessionTimers);

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
			.returning(),
	);

	if (!updated) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}

	await scheduleSessionTimers(updated, ['registration_close']);

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

	const { ended, nextSession } = await tracedQuery('market_session.close_session', () =>
		db.transaction((tx) => endSession(tx, event, 'close')),
	);

	if (!ended) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}

	if (nextSession) {
		await scheduleSessionTimers(nextSession, upcomingSessionTimers);
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
				.returning();

			if (!updated) {
				return null;
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

			return updated;
		}),
	);

	if (!closed) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}

	await scheduleSessionTimers(closed, ['lottery_draw']);

	return { ok: true };
}

/** How far a worker can push back an automatic draw in one go. */
const lotteryPostponementSchema = z.object({ minutes: z.coerce.number().int().min(1).max(10) });

/**
 * Pushes an automatic lottery draw back by a few minutes, while it is still pending. The delay is
 * stored as an offset, so this adds to it, and the draw timer is re-armed at the new time — the
 * one already queued finds its time has moved and does nothing.
 */
export async function postponeLottery(event: MarketEventRow, body: unknown): Promise<ActionResult> {
	const postponement = lotteryPostponementSchema.safeParse(body);
	const delay = event.lotteryDelayMinutes;

	if (
		!canRunSessionCommand(event.status, 'postpone_lottery') ||
		delay == null ||
		!postponement.success
	) {
		return {
			ok: false,
			status: 409,
			error: 'Only a pending automatic draw can be postponed, by 1 to 10 minutes.',
		};
	}

	const [updated] = await tracedQuery('market_session.postpone_lottery', () =>
		db
			.update(marketEvents)
			.set({ lotteryDelayMinutes: delay + postponement.data.minutes })
			.where(
				and(
					eq(marketEvents.id, event.id),
					eq(marketEvents.status, 'lottery_pending'),
					eq(marketEvents.lotteryDelayMinutes, delay),
				),
			)
			.returning(),
	);

	if (!updated) {
		return {
			ok: false,
			status: 409,
			error: 'That session transition is not allowed from the current state.',
		};
	}

	await scheduleSessionTimers(updated, ['lottery_draw']);

	return { ok: true };
}

/** Clearing the delay invalidates any queued draw timer, which rechecks the current deadline. */
export async function pauseLottery(event: MarketEventRow): Promise<ActionResult> {
	const delay = event.lotteryDelayMinutes;

	if (!canRunSessionCommand(event.status, 'pause_lottery') || delay == null) {
		return { ok: false, status: 409, error: 'Only a pending automatic draw can be paused.' };
	}
	const [updated] = await tracedQuery('market_session.pause_lottery', () =>
		db
			.update(marketEvents)
			.set({ lotteryDelayMinutes: null })
			.where(
				and(
					eq(marketEvents.id, event.id),
					eq(marketEvents.status, 'lottery_pending'),
					eq(marketEvents.lotteryDelayMinutes, delay),
				),
			)
			.returning(),
	);

	return updated
		? { ok: true }
		: {
				ok: false,
				status: 409,
				error: 'That session transition is not allowed from the current state.',
			};
}
