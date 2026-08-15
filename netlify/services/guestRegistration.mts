import { and, eq } from 'drizzle-orm';

import { db } from '../../db/index.mjs';
import { guests, marketEvents, registrationQuestions, visits } from '../../db/schema.mjs';
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
import { automaticSessionStatus } from '../../src/services/sessionStateMachine.js';
import type { VisitStatus } from '../../src/services/visitStateMachine.js';
import {
	authenticateGuest,
	hashPin,
	isValidPin,
	issueVisitToken,
	normalizePhone,
} from './guestCredentials.mjs';
import { nextQueuePosition } from './visitQueue.mjs';

const locales = ['en', 'es', 'fa', 'tl', 'vi', 'zh', 'ar'] as const;

export type GuestSubmission = {
	firstName: string;
	lastName: string;
	ageRange: AgeRange;
	householdSize: number;
	childrenCount: number;
	seniorsCount: number;
	phone: string;
	locale: (typeof locales)[number];
	marketEventId: string | null;
	answers: Record<string, string | number>;
	source: 'self' | 'admin';
	registrationType: 'new' | 'returning';
	pin: string;
	updateProfile: boolean;
	queuePlacement: QueuePlacement;
	admission: GuestAdmission;
	lotteryWeight: number;
};

export type RegisterGuestResult =
	| {
			ok: true;
			status: 200 | 201;
			body: { id: string; guestId: string; status: string; visitToken?: string };
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
	const registrationType = body.registrationType === 'returning' ? 'returning' : 'new';
	const pin = typeof body.pin === 'string' ? body.pin : '';
	const updateProfile = body.updateProfile === true;
	const queuePlacement: QueuePlacement = body.queuePlacement === 'next' ? 'next' : 'end';
	// `queue` keeps the original walk-in behaviour for any caller that predates the admission field.
	const admission: GuestAdmission = isGuestAdmission(body.admission) ? body.admission : 'queue';
	// Anything a caller omits or fudges lands on the default odds rather than failing the insert.
	const lotteryWeight = normalizeLotteryWeight(body.lotteryWeight);
	const marketEventId = typeof body.marketEventId === 'string' ? body.marketEventId : null;
	const answers = body.answers ?? {};
	const needsProfile = source === 'admin' || registrationType === 'new' || updateProfile;
	const normalizedPhone = normalizePhone(phone);

	if (
		!phone ||
		phone.length > 40 ||
		normalizedPhone.length < 8 ||
		normalizedPhone.length > 16 ||
		!locales.some((item) => item === locale) ||
		!isAnswers(answers) ||
		(source === 'self' && !isValidPin(pin)) ||
		(needsProfile &&
			(!firstName ||
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
				childrenCount + seniorsCount > householdSize))
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
		registrationType,
		pin,
		updateProfile,
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
		const effectiveStatus = automaticSessionStatus(event, now);
		// Guests may register as soon as an event exists at all — including `draft`, before an admin
		// has scheduled registration — so signing up ahead of time doesn't depend on what stage the
		// session is in. Only once the window has genuinely passed (closed, service started, or the
		// session ended) does self-registration stop making sense.
		if (
			effectiveStatus === 'registration_closed' ||
			effectiveStatus === 'service_started' ||
			effectiveStatus === 'ended'
		) {
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

	let existingGuest: typeof guests.$inferSelect | null = null;
	let existingVisit: { id: string; status: VisitStatus } | null = null;
	if (submission.source === 'self' && submission.registrationType === 'returning') {
		existingGuest = await authenticateGuest(submission.phone, submission.pin);
		if (!existingGuest) {
			return { ok: false, status: 401, error: 'The phone number or PIN could not be verified.' };
		}
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

	const pinHash =
		submission.source === 'self' && submission.registrationType === 'new'
			? await hashPin(submission.pin)
			: null;
	const visitCredential = issueVisitToken();
	const registration = await db.transaction(async (tx) => {
		let guest = existingGuest;
		if (guest && submission.updateProfile) {
			const [updated] = await tx
				.update(guests)
				.set({
					firstName: submission.firstName,
					lastName: submission.lastName,
					ageRange: submission.ageRange,
					householdSize: submission.householdSize,
					childrenCount: submission.childrenCount,
					seniorsCount: submission.seniorsCount,
					locale: submission.locale,
				})
				.where(eq(guests.id, guest.id))
				.returning();
			guest = updated!;
		}
		if (!guest) {
			const [created] = await tx
				.insert(guests)
				.values({
					firstName: submission.firstName,
					lastName: submission.lastName,
					ageRange: submission.ageRange,
					householdSize: submission.householdSize,
					childrenCount: submission.childrenCount,
					seniorsCount: submission.seniorsCount,
					phone: submission.phone,
					normalizedPhone: normalizePhone(submission.phone),
					pinHash,
					locale: submission.locale,
				})
				.returning();
			guest = created!;
		}
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
						isFirstVisit: submission.registrationType === 'new',
						// `guest` reflects the just-created/updated row, or — for a returning guest not
						// updating their profile — the existing stored values, so this always carries
						// over the guest's current counts even when the fields weren't resubmitted.
						childrenCount: guest.childrenCount,
						seniorsCount: guest.seniorsCount,
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
		};
	});

	return { ok: true, status: existingVisit ? 200 : 201, body: registration };
}
