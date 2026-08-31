import { and, eq } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { marketEvents, registrationQuestions, visits } from '../../db/schema.mjs';
import { isAgeRange, type AgeRange } from '../../src/services/ageRanges.js';
import {
	admissionNeedsQueuePosition,
	admissionVisitStatus,
	canAdmitGuest,
	isGuestAdmission,
	type GuestAdmission,
	type QueuePlacement,
} from '../../src/services/guestAdmission.js';
import { normalizeLotteryWeight } from '../../src/services/lotteryWeight.js';
import { acceptsSelfRegistration } from '../../src/services/sessionStateMachine.js';
import type { VisitStatus } from '../../src/services/visitStateMachine.js';
import {
	findGuestByDeviceToken,
	guestLocales,
	persistGuestInformation,
} from './guest-information.mjs';
import { issueDeviceToken, issueVisitToken, normalizePhone } from './guestCredentials.mjs';
import { nextQueuePosition } from './visitQueue.mjs';

export type GuestSubmission = {
	firstName: string;
	lastName: string;
	ageRange: AgeRange;
	householdSize: number;
	childrenCount: number;
	seniorsCount: number;
	phone: string;
	locale: (typeof guestLocales)[number];
	marketEventId: string | null;
	answers: Record<string, string | number>;
	source: 'self' | 'admin';
	deviceToken: string | null;
	queuePlacement: QueuePlacement;
	admission: GuestAdmission;
	lotteryWeight: number;
};

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

function isAnswers(value: unknown): value is Record<string, string | number> {
	return (
		!!value &&
		typeof value === 'object' &&
		Object.values(value).every((answer) => typeof answer === 'string' || typeof answer === 'number')
	);
}

export function parseSubmission(value: unknown): GuestSubmission | null {
	if (!value || typeof value !== 'object') {
		return null;
	}

	const body = value as Record<string, unknown>;
	const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
	const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
	const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
	const ageRange = (typeof body.ageRange === 'string' ? body.ageRange : '') as AgeRange;
	const householdSize = Number(body.householdSize);
	const childrenCount = Number(body.childrenCount);
	const seniorsCount = Number(body.seniorsCount);
	const locale = body.locale;
	const source = body.source === 'admin' ? 'admin' : 'self';
	const rawDeviceToken = body.deviceToken;
	const deviceToken = typeof rawDeviceToken === 'string' ? rawDeviceToken.trim() : null;
	const queuePlacement: QueuePlacement = body.queuePlacement === 'next' ? 'next' : 'end';
	// `queue` keeps the original walk-in behaviour for any caller that predates the admission field.
	const admission: GuestAdmission = isGuestAdmission(body.admission) ? body.admission : 'queue';
	// Anything a caller omits or fudges lands on the default odds rather than failing the insert.
	const lotteryWeight = normalizeLotteryWeight(body.lotteryWeight);
	const marketEventId = typeof body.marketEventId === 'string' ? body.marketEventId : null;
	const answers = body.answers ?? {};
	const normalizedPhone = normalizePhone(phone);

	if (
		!phone ||
		phone.length > 40 ||
		normalizedPhone.length < 8 ||
		normalizedPhone.length > 16 ||
		!guestLocales.some((item) => item === locale) ||
		!isAnswers(answers) ||
		(source === 'self' &&
			rawDeviceToken !== undefined &&
			rawDeviceToken !== null &&
			(!deviceToken || deviceToken.length < 32 || deviceToken.length > 200)) ||
		!firstName ||
		!lastName ||
		firstName.length > 100 ||
		lastName.length > 100 ||
		!isAgeRange(ageRange) ||
		!Number.isInteger(householdSize) ||
		householdSize < 1 ||
		householdSize > 30 ||
		!Number.isInteger(childrenCount) ||
		childrenCount < 0 ||
		childrenCount > 30 ||
		!Number.isInteger(seniorsCount) ||
		seniorsCount < 0 ||
		seniorsCount > 30 ||
		childrenCount + seniorsCount > householdSize
	) {
		return null;
	}

	return {
		firstName,
		lastName,
		ageRange,
		householdSize,
		childrenCount,
		seniorsCount,
		phone,
		locale: locale as GuestSubmission['locale'],
		marketEventId,
		answers,
		source,
		deviceToken: source === 'self' ? deviceToken : null,
		queuePlacement,
		admission,
		lotteryWeight,
	};
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
		const [event] = await db
			.select({ status: marketEvents.status })
			.from(marketEvents)
			.where(eq(marketEvents.id, submission.marketEventId!))
			.limit(1);

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

		const [event] = await db
			.select()
			.from(marketEvents)
			.where(eq(marketEvents.id, submission.marketEventId))
			.limit(1);

		if (!event) {
			return { ok: false, status: 409, error: 'Registration is not open.' };
		}

		const now = new Date();

		// Once the guest UI closes, an already-in-flight request may still land during the short grace
		// period. `lottery_pending` is the hard boundary where the pool has been frozen.
		if (!acceptsSelfRegistration(event, now)) {
			return { ok: false, status: 409, error: 'Registration is not open.' };
		}

		const questions = await db
			.select({
				id: registrationQuestions.id,
				type: registrationQuestions.type,
				required: registrationQuestions.required,
			})
			.from(registrationQuestions)
			.where(eq(registrationQuestions.marketEventId, submission.marketEventId));

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
		const [visit] = await db
			.select({ id: visits.id, status: visits.status })
			.from(visits)
			.where(
				and(
					eq(visits.guestId, existingGuest.id),
					eq(visits.marketEventId, submission.marketEventId!),
				),
			)
			.limit(1);

		existingVisit = visit ?? null;
	}

	const isFirstVisit = existingGuest === null;
	const deviceCredential =
		submission.source === 'self' && !existingGuest ? issueDeviceToken() : null;
	const visitCredential = issueVisitToken();
	const registration = await db
		.transaction(async (tx) => {
			const [event] = await tx
				.select()
				.from(marketEvents)
				.where(eq(marketEvents.id, submission.marketEventId!))
				.limit(1)
				.for('update');

			if (
				!event ||
				(submission.source === 'self' && !acceptsSelfRegistration(event, new Date())) ||
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
								submission.source === 'admin' && submission.admission === 'lottery'
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
		});

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
