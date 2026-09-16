import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../../db/index.mjs';
import { marketEvents, registrationQuestions, visits } from '../../db/schema.mjs';
import { SessionTimeline } from '../../src/models/session-timeline.js';
import { ageRanges } from '../../src/services/ageRanges.js';
import {
	admissionNeedsQueuePosition,
	admissionTakesLotteryWeight,
	admissionVisitStatus,
	canAdmitGuest,
	guestAdmissions,
} from '../../src/services/guestAdmission.js';
import { normalizeLotteryWeight } from '../../src/services/lotteryWeight.js';
import type { VisitStatus } from '../../src/services/visitStateMachine.js';
import { tracedQuery } from '../lib/sentry.mjs';
import {
	deviceTokenSchema,
	findGuestByDeviceToken,
	guestIdentitySchema,
	persistGuestInformation,
} from './guest-information.mjs';
import { issueDeviceToken, issueVisitToken, normalizePhone } from './guestCredentials.mjs';
import { nextQueuePosition } from './visitQueue.mjs';

/** How many people a visit can cover, matching the household columns' database constraints. */
const shopperCountSchema = z.coerce.number().int().min(0).max(30);

const submissionFields = guestIdentitySchema.extend({
	ageRange: z.enum(ageRanges),
	householdSize: z.coerce.number().int().min(1).max(30),
	childrenCount: shopperCountSchema,
	seniorsCount: shopperCountSchema,
	marketEventId: z
		.string()
		.nullish()
		.transform((eventId) => eventId ?? null),
	answers: z
		.record(z.string(), z.union([z.string(), z.number()]))
		.nullish()
		.transform((answers) => answers ?? {}),
	queuePlacement: z.enum(['end', 'next']).catch('end'),
	// `queue` keeps the original walk-in behaviour for any caller that predates the admission field.
	admission: z.enum(guestAdmissions).catch('queue'),
	// Anything a caller omits or fudges lands on the default odds rather than failing the insert.
	lotteryWeight: z.unknown().optional().transform(normalizeLotteryWeight),
});

/** A worker adding a guest from the admin console, which has no device credential to offer. */
const adminSubmissionSchema = submissionFields.extend({
	source: z.literal('admin'),
	deviceToken: z
		.unknown()
		.optional()
		.transform(() => null),
});

/** A guest registering on their own phone, which may carry the credential we issued that browser. */
const selfSubmissionSchema = submissionFields.extend({
	source: z
		.unknown()
		.optional()
		.transform(() => 'self' as const),
	deviceToken: deviceTokenSchema,
});

/**
 * Admin first: a submission only counts as one when it says so, and everything else — including a
 * caller that omits `source` entirely — is a guest registering for themselves.
 */
export const guestSubmissionSchema = z
	.union([adminSubmissionSchema, selfSubmissionSchema])
	.refine(
		({ childrenCount, seniorsCount, householdSize }) =>
			childrenCount + seniorsCount <= householdSize,
		{ path: ['householdSize'], error: 'A household cannot be smaller than the people in it.' },
	);

export type GuestSubmission = z.infer<typeof guestSubmissionSchema>;

export type RegisterGuestResult =
	| {
			ok: true;
			status: 200 | 201;
			body: {
				id: string;
				guestId: string;
				status: string;
				visitToken?: string;
				deviceToken?: string;
			};
	  }
	| { ok: false; status: number; error: string };

export function parseSubmission(value: unknown): GuestSubmission | null {
	return guestSubmissionSchema.safeParse(value).data ?? null;
}

/**
 * Validates eligibility, then creates or updates the guest and their visit in a single
 * transaction. Assumes the caller has already gated admin-source submissions behind
 * `requirePermission` — this function only checks registration-window and question eligibility.
 */
export async function registerGuest(submission: GuestSubmission): Promise<RegisterGuestResult> {
	if (submission.source === 'admin' && !submission.marketEventId) {
		return { ok: false, status: 409, error: 'No market event has been configured.' };
	}

	if (submission.source === 'admin') {
		const [event] = await tracedQuery('registration.read_event_status', () =>
			db
				.select({ status: marketEvents.status })
				.from(marketEvents)
				.where(eq(marketEvents.id, submission.marketEventId!))
				.limit(1),
		);

		if (!event) {
			return { ok: false, status: 409, error: 'No market event has been configured.' };
		}

		// A worker can add a guest at any stage, but what "adding" means changes as the session
		// progresses — see `admissionsFor` for which options each stage allows.
		if (!canAdmitGuest(event.status, submission.admission)) {
			return {
				ok: false,
				status: 409,
				error: 'That way of adding a guest is not available while the session is in this state.',
			};
		}
	}

	if (submission.source === 'self') {
		if (!submission.marketEventId) {
			return { ok: false, status: 409, error: 'Registration is not open.' };
		}

		// TypeScript drops the non-null narrowing on a property read inside a closure, so the id is
		// captured here for the queries below to close over — the same reason `getCurrentEvent`
		// captures its event.
		const marketEventId = submission.marketEventId;
		const [event] = await tracedQuery('registration.read_event', () =>
			db.select().from(marketEvents).where(eq(marketEvents.id, marketEventId)).limit(1),
		);

		if (!event) {
			return { ok: false, status: 409, error: 'Registration is not open.' };
		}

		const now = new Date();

		// Once the guest UI closes, an already-in-flight request may still land during the short grace
		// period. `lottery_pending` is the hard boundary where the pool has been frozen.
		if (!new SessionTimeline(event).acceptsSelfRegistration(now)) {
			return { ok: false, status: 409, error: 'Registration is not open.' };
		}

		const questions = await tracedQuery('registration.read_questions', () =>
			db
				.select({
					id: registrationQuestions.id,
					type: registrationQuestions.type,
					required: registrationQuestions.required,
				})
				.from(registrationQuestions)
				.where(eq(registrationQuestions.marketEventId, marketEventId)),
		);

		for (const question of questions) {
			const answer = submission.answers[question.id];

			if (question.required && (answer === undefined || answer === '')) {
				return {
					ok: false,
					status: 400,
					error: 'Please answer all required registration questions.',
				};
			}

			if (
				question.type === 'scale' &&
				answer !== undefined &&
				(!Number.isInteger(answer) || Number(answer) < 1 || Number(answer) > 10)
			) {
				return { ok: false, status: 400, error: 'Please provide valid registration answers.' };
			}
		}
	}

	const existingGuest =
		submission.source === 'self' ? await findGuestByDeviceToken(submission.deviceToken) : null;
	let existingVisit: { id: string; status: VisitStatus } | null = null;

	if (existingGuest) {
		const [visit] = await tracedQuery('registration.read_existing_visit', () =>
			db
				.select({ id: visits.id, status: visits.status })
				.from(visits)
				.where(
					and(
						eq(visits.guestId, existingGuest.id),
						eq(visits.marketEventId, submission.marketEventId!),
					),
				)
				.limit(1),
		);

		existingVisit = visit ?? null;
	}

	const isFirstVisit = existingGuest === null;
	const deviceCredential =
		submission.source === 'self' && !existingGuest ? issueDeviceToken() : null;
	const visitCredential = issueVisitToken();
	const registration = await tracedQuery('registration.persist', () =>
		db
			.transaction(async (tx) => {
				const [event] = await tx
					.select()
					.from(marketEvents)
					.where(eq(marketEvents.id, submission.marketEventId!))
					.limit(1)
					.for('update');

				if (
					!event ||
					(submission.source === 'self' &&
						!new SessionTimeline(event).acceptsSelfRegistration(new Date())) ||
					(submission.source === 'admin' && !canAdmitGuest(event.status, submission.admission))
				) {
					throw new Error('INVALID_REGISTRATION_STATE');
				}

				const guest = await persistGuestInformation(tx, {
					existingGuest,
					information: submission,
					deviceTokenHash: deviceCredential?.tokenHash ?? null,
				});
				// Only a guest going straight into the line needs a position now. Everyone else is either
				// still pre-lottery and gets theirs from `runLottery`, or is not queued at all.
				const queuePosition =
					submission.source === 'admin' && admissionNeedsQueuePosition(submission.admission)
						? await nextQueuePosition(tx, submission.marketEventId!, submission.queuePlacement)
						: null;
				const [visit] = existingVisit
					? await tx
							.update(visits)
							.set({
								accessTokenHash: visitCredential.tokenHash,
								answers: submission.answers,
								ageRange: submission.ageRange,
								householdSize: submission.householdSize,
								childrenCount: submission.childrenCount,
								seniorsCount: submission.seniorsCount,
								normalizedPhone: normalizePhone(submission.phone),
								status: existingVisit.status === 'cancelled' ? 'registered' : existingVisit.status,
							})
							.where(eq(visits.id, existingVisit.id))
							.returning({ id: visits.id, status: visits.status })
					: await tx
							.insert(visits)
							.values({
								guestId: guest.id,
								marketEventId: submission.marketEventId!,
								status:
									submission.source === 'admin'
										? admissionVisitStatus(submission.admission)
										: 'registered',
								queuePosition,
								answers: submission.answers,
								source: submission.source,
								accessTokenHash: visitCredential.tokenHash,
								isFirstVisit,
								ageRange: submission.ageRange,
								householdSize: submission.householdSize,
								childrenCount: submission.childrenCount,
								seniorsCount: submission.seniorsCount,
								normalizedPhone: normalizePhone(submission.phone),
								// Only a guest actually entering the draw can carry anything but the default odds.
								lotteryWeight:
									submission.source === 'admin' && admissionTakesLotteryWeight(submission.admission)
										? submission.lotteryWeight
										: 1,
							})
							.returning({ id: visits.id, status: visits.status });

				return {
					id: visit!.id,
					guestId: guest.id,
					status: visit!.status,
					visitToken: submission.source === 'self' ? visitCredential.token : undefined,
					deviceToken: deviceCredential?.token,
				};
			})
			.catch((cause: unknown) => {
				if (cause instanceof Error && cause.message === 'INVALID_REGISTRATION_STATE') {
					return null;
				}

				throw cause;
			}),
	);

	if (!registration) {
		return {
			ok: false,
			status: 409,
			error:
				submission.source === 'self'
					? 'Registration is not open.'
					: 'That way of adding a guest is not available while the session is in this state.',
		};
	}

	return { ok: true, status: existingVisit ? 200 : 201, body: registration };
}
