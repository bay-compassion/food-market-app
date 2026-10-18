import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../../db/index.mjs';
import { marketEvents, registrationQuestions, visits } from '../../db/schema.mjs';
import {
	HouseholdComposition,
	householdCounts,
	type HouseholdCount,
	type HouseholdCounts,
	type HouseholdIssue,
} from '../../src/models/household-composition.js';
import { QueueNumber } from '../../src/models/queue-number.js';
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
import type { VisitEventActor } from '../../src/services/visit-events.js';
import type { VisitStatus } from '../../src/services/visitStateMachine.js';
import { tracedQuery } from '../lib/sentry.mjs';
import {
	deviceTokenSchema,
	findGuestByDeviceToken,
	guestIdentitySchema,
	persistGuestInformation,
} from './guest-information.mjs';
import { issueDeviceToken, issueVisitToken, normalizePhone } from './guestCredentials.mjs';
import { recordVisitEvents } from './visit-events.mjs';
import { placeInLine } from './visitQueue.mjs';

/**
 * A household count as it arrives. Coercing here would read an empty field as `0`, so the counts
 * are checked by `HouseholdComposition` instead — the same rules the registration form applies.
 */
const householdCountSchema = z.union([z.number(), z.string()]).nullish();

const submissionFields = guestIdentitySchema.extend({
	ageRange: z.enum(ageRanges),
	householdSize: householdCountSchema,
	childrenCount: householdCountSchema,
	seniorsCount: householdCountSchema,
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

/**
 * Reports each of the household's issues against its own field, then hands on the counts as
 * numbers. The issue's message is its `HouseholdIssue` code, which `describeSubmissionIssues` words.
 */
function withHousehold<Output extends HouseholdCounts>(schema: z.ZodType<Output>) {
	return schema
		.superRefine((submission, context) => {
			const { issues } = new HouseholdComposition(submission);

			for (const count of householdCounts) {
				const issue = issues[count];

				if (issue) {
					context.addIssue({ code: 'custom', path: [count], message: issue });
				}
			}
		})
		.transform((submission): Omit<Output, HouseholdCount> & Record<HouseholdCount, number> => ({
			...submission,
			...new HouseholdComposition(submission).values,
		}));
}

/** A worker adding a guest from the admin console, which has no device credential to offer. */
const adminSubmissionSchema = withHousehold(
	submissionFields.extend({
		source: z.literal('admin'),
		deviceToken: z
			.unknown()
			.optional()
			.transform(() => null),
	}),
);

/** A guest registering on their own phone, which may carry the credential we issued that browser. */
const selfSubmissionSchema = withHousehold(
	submissionFields.extend({
		source: z
			.unknown()
			.optional()
			.transform(() => 'self' as const),
		deviceToken: deviceTokenSchema,
	}),
);

export type GuestSubmission =
	| z.output<typeof adminSubmissionSchema>
	| z.output<typeof selfSubmissionSchema>;

/** Why a submission was refused: a sentence for a person, and a code per field for a form. */
export type SubmissionIssues = {
	error: string;
	fields: Record<string, string>;
};

export type SubmissionValidation =
	| { success: true; data: GuestSubmission }
	| ({ success: false } & SubmissionIssues);

const fieldNames: Record<string, string> = {
	firstName: 'First name',
	lastName: 'Last name',
	phone: 'Phone number',
	locale: 'Language',
	pronunciation: 'Pronunciation',
	ageRange: 'Age range',
	householdSize: 'Household size',
	childrenCount: 'Number of children',
	seniorsCount: 'Number of seniors',
	marketEventId: 'Market event',
	answers: 'Answers',
	deviceToken: 'Device credential',
};

const householdIssueText: Record<HouseholdIssue, (field: string, count: HouseholdCount) => string> =
	{
		required: (field) => `${field} is required.`,
		'not-whole-number': (field) => `${field} must be a whole number.`,
		'out-of-range': (field, count) => {
			const { min, max } = HouseholdComposition.ranges[count];

			return `${field} must be from ${min} to ${max}.`;
		},
		'exceeds-household': () =>
			'Children and seniors together cannot be more than the household size.',
		'no-adult': () =>
			'A household must include at least one adult, since children cannot shop on their own.',
	};

/** The message a field left out of the request is given, so it reads as missing, not mistyped. */
const missingField = 'required';

/** Zod's own wording for a missing field is "expected string, received undefined". */
const reportMissingFields: z.core.$ZodErrorMap = (issue) =>
	issue.input === undefined ? missingField : undefined;

function isHouseholdCount(field: string): field is HouseholdCount {
	return (householdCounts as readonly string[]).includes(field);
}

function isHouseholdIssue(message: string): message is HouseholdIssue {
	return Object.hasOwn(householdIssueText, message);
}

/** Words each of zod's issues for a person, and keys its code by the field it concerns. */
export function describeSubmissionIssues(error: z.ZodError): SubmissionIssues {
	const sentences: string[] = [];
	const fields: Record<string, string> = {};

	for (const issue of error.issues) {
		const field = issue.path.map(String).join('.');
		const name = fieldNames[field] ?? (field || 'Registration');

		if (isHouseholdCount(field) && isHouseholdIssue(issue.message)) {
			sentences.push(householdIssueText[issue.message](name, field));
			fields[field] ??= issue.message;
		} else if (issue.message === missingField) {
			sentences.push(`${name} is required.`);
			fields[field] ??= missingField;
		} else {
			sentences.push(`${name}: ${issue.message}`);
			fields[field] ??= issue.code;
		}
	}

	return { error: sentences.join(' '), fields };
}

/**
 * Checks a registration, saying what is wrong with it when it is refused. Only a submission that
 * says `source: 'admin'` is checked as one; everything else — including a caller that omits
 * `source` entirely — is a guest registering for themselves. Choosing the schema up front, rather
 * than trying both, keeps a refusal's issues about the fields themselves.
 */
export function validateSubmission(value: unknown): SubmissionValidation {
	const isAdmin =
		typeof value === 'object' && value !== null && 'source' in value && value.source === 'admin';
	const result = (isAdmin ? adminSubmissionSchema : selfSubmissionSchema).safeParse(value, {
		error: reportMissingFields,
	});

	return result.success
		? { success: true, data: result.data }
		: { success: false, ...describeSubmissionIssues(result.error) };
}

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
	const validation = validateSubmission(value);

	return validation.success ? validation.data : null;
}

/**
 * Validates eligibility, then creates or updates the guest and their visit in a single
 * transaction. Assumes the caller has already gated admin-source submissions behind
 * `requirePermission` — this function only checks registration-window and question eligibility.
 */
/**
 * `actor` is who is registering: the guest themselves, or the worker adding them by hand. It is
 * recorded in the visit's history.
 */
export async function registerGuest(
	submission: GuestSubmission,
	actor: VisitEventActor,
): Promise<RegisterGuestResult> {
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
				// Only a guest going straight into the line needs a number now. Everyone else is either
				// still pre-lottery and gets theirs from `runLottery`, or is not queued at all.
				const slot =
					!existingVisit &&
					submission.source === 'admin' &&
					admissionNeedsQueuePosition(submission.admission)
						? await placeInLine(tx, submission.marketEventId!, submission.queuePlacement)
						: null;
				const number = slot ? QueueNumber.of(slot) : null;
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
								...slot,
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

				// A new visit starts its history; an existing one only gains an entry when a guest who
				// had cancelled registers again. Updating the details of a live visit changes no status.
				if (!existingVisit) {
					await recordVisitEvents(tx, [
						{
							visitId: visit!.id,
							kind: submission.source === 'admin' ? 'added' : 'registered',
							toStatus: visit!.status,
							actor,
							details: number ? number.toDetails() : undefined,
						},
					]);
				} else if (existingVisit.status === 'cancelled') {
					await recordVisitEvents(tx, [
						{ visitId: visit!.id, kind: 'registered', toStatus: visit!.status, actor },
					]);
				}

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
