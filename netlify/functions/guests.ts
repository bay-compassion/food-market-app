import { and, desc, eq, ilike, ne, or } from 'drizzle-orm';

import { db } from '../../db/index.js';
import {
	guests,
	marketEvents,
	notificationDeliveries,
	registrationQuestions,
	visits,
} from '../../db/schema.js';
import { automaticSessionStatus } from '../../src/services/sessionStateMachine.js';
import { requireAuth0 } from '../lib/auth.js';
import {
	authenticateGuest,
	hashPin,
	isValidPin,
	issueVisitToken,
	normalizePhone,
} from '../services/guestCredentials.js';
import { deliverPendingNotifications } from '../services/pushNotifications.js';

const locales = ['en', 'es', 'fa', 'tl', 'vi', 'zh', 'ar'] as const;
const statuses = [
	'registered',
	'waiting',
	'called',
	'served',
	'not_placed',
	'no_show',
	'cancelled',
] as const;

type GuestSubmission = {
	firstName: string;
	lastName: string;
	age: number;
	householdSize: number;
	phone: string;
	locale: (typeof locales)[number];
	marketEventId: string | null;
	answers: Record<string, string | number>;
	source: 'self' | 'admin';
	registrationType: 'new' | 'returning';
	pin: string;
	updateProfile: boolean;
};

function error(message: string, status = 400) {
	return Response.json({ error: message }, { status });
}

function isAnswers(value: unknown): value is Record<string, string | number> {
	return (
		!!value &&
		typeof value === 'object' &&
		Object.values(value).every((answer) => typeof answer === 'string' || typeof answer === 'number')
	);
}

function parseSubmission(value: unknown): GuestSubmission | null {
	if (!value || typeof value !== 'object') {
		return null;
	}

	const body = value as Record<string, unknown>;
	const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
	const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
	const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
	const age = Number(body.age);
	const householdSize = Number(body.householdSize);
	const locale = body.locale;
	const source = body.source === 'admin' ? 'admin' : 'self';
	const registrationType = body.registrationType === 'returning' ? 'returning' : 'new';
	const pin = typeof body.pin === 'string' ? body.pin : '';
	const updateProfile = body.updateProfile === true;
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
				!Number.isInteger(age) ||
				age < 0 ||
				age > 120 ||
				!Number.isInteger(householdSize) ||
				householdSize < 1 ||
				householdSize > 30))
	) {
		return null;
	}

	return {
		firstName,
		lastName,
		age,
		householdSize,
		phone,
		locale: locale as GuestSubmission['locale'],
		marketEventId,
		answers,
		source,
		registrationType,
		pin,
		updateProfile,
	};
}

async function currentEventId() {
	const [event] = await db
		.select({ id: marketEvents.id })
		.from(marketEvents)
		.where(ne(marketEvents.status, 'ended'))
		.orderBy(desc(marketEvents.createdAt))
		.limit(1);

	return event?.id ?? null;
}

async function listGuests(request: Request) {
	const url = new URL(request.url);
	const query = url.searchParams.get('q')?.trim() ?? '';
	const eventId =
		url.searchParams.get('scope') === 'all'
			? null
			: (url.searchParams.get('marketEventId') ?? (await currentEventId()));
	const eventFilter = eventId ? eq(visits.marketEventId, eventId) : undefined;
	const searchFilter = query
		? or(
				ilike(guests.firstName, `%${query}%`),
				ilike(guests.lastName, `%${query}%`),
				ilike(guests.phone, `%${query}%`),
			)
		: undefined;
	const where =
		eventFilter && searchFilter ? and(eventFilter, searchFilter) : (eventFilter ?? searchFilter);

	return Response.json(
		await db
			.select({
				id: visits.id,
				guestId: guests.id,
				marketEventId: visits.marketEventId,
				firstName: guests.firstName,
				lastName: guests.lastName,
				age: guests.age,
				householdSize: guests.householdSize,
				phone: guests.phone,
				locale: guests.locale,
				status: visits.status,
				queuePosition: visits.queuePosition,
				calledAt: visits.calledAt,
				answers: visits.answers,
				source: visits.source,
				visitDate: visits.visitDate,
				isFirstVisit: visits.isFirstVisit,
				createdAt: visits.createdAt,
			})
			.from(guests)
			.innerJoin(visits, eq(visits.guestId, guests.id))
			.where(where)
			.orderBy(desc(visits.createdAt))
			.limit(eventId ? 10_000 : 100),
	);
}

async function createGuest(request: Request) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return error('Request body must be valid JSON.');
	}

	const submission = parseSubmission(body);
	if (!submission) {
		return error('Please provide valid guest information.');
	}
	if (submission.source === 'admin') {
		const unauthorized = await requireAuth0(request);
		if (unauthorized) {
			return unauthorized;
		}
	}
	if (submission.source === 'admin' && !submission.marketEventId) {
		return error('No market event has been configured.', 409);
	}
	if (submission.source === 'admin') {
		const [event] = await db
			.select({ status: marketEvents.status })
			.from(marketEvents)
			.where(eq(marketEvents.id, submission.marketEventId!))
			.limit(1);
		if (event?.status !== 'service_started') {
			return error('Guests can only be added to the queue after service starts.', 409);
		}
	}

	if (submission.source === 'self') {
		if (!submission.marketEventId) {
			return error('Registration is not open.', 409);
		}
		const [event] = await db
			.select()
			.from(marketEvents)
			.where(eq(marketEvents.id, submission.marketEventId))
			.limit(1);
		const now = new Date();
		const effectiveStatus = event ? automaticSessionStatus(event, now) : null;
		if (
			!event ||
			effectiveStatus !== 'registration_open' ||
			now < event.registrationOpensAt ||
			now > event.registrationClosesAt
		) {
			return error('Registration is not open.', 409);
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
				return error('Please answer all required registration questions.');
			}
			if (
				question.type === 'scale' &&
				answer !== undefined &&
				(!Number.isInteger(answer) || Number(answer) < 1 || Number(answer) > 10)
			) {
				return error('Please provide valid registration answers.');
			}
		}
	}

	let existingGuest: typeof guests.$inferSelect | null = null;
	let existingVisit: { id: string; status: string } | null = null;
	if (submission.source === 'self' && submission.registrationType === 'returning') {
		existingGuest = await authenticateGuest(submission.phone, submission.pin);
		if (!existingGuest) {
			return error('The phone number or PIN could not be verified.', 401);
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
					age: submission.age,
					householdSize: submission.householdSize,
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
					age: submission.age,
					householdSize: submission.householdSize,
					phone: submission.phone,
					normalizedPhone: normalizePhone(submission.phone),
					pinHash,
					locale: submission.locale,
				})
				.returning();
			guest = created!;
		}
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
						status: submission.source === 'admin' ? 'waiting' : 'registered',
						answers: submission.answers,
						source: submission.source,
						accessTokenHash: visitCredential.tokenHash,
						isFirstVisit: submission.registrationType === 'new',
					})
					.returning({ id: visits.id, status: visits.status });

		return {
			id: visit!.id,
			guestId: guest.id,
			status: visit!.status,
			visitToken: submission.source === 'self' ? visitCredential.token : undefined,
		};
	});

	return Response.json(registration, { status: existingVisit ? 200 : 201 });
}

async function updateGuest(request: Request) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return error('Request body must be valid JSON.');
	}
	if (!body || typeof body !== 'object') {
		return error('Invalid guest update.');
	}

	const { id, status } = body as Record<string, unknown>;
	if (
		typeof id !== 'string' ||
		typeof status !== 'string' ||
		!statuses.some((item) => item === status)
	) {
		return error('Invalid guest update.');
	}

	const visit = await db.transaction(async (tx) => {
		const [updated] = await tx
			.update(visits)
			.set(status === 'called' ? { status, calledAt: new Date() } : { status })
			.where(
				status === 'called'
					? and(eq(visits.id, id), eq(visits.status, 'waiting'))
					: eq(visits.id, id),
			)
			.returning({ id: visits.id, status: visits.status });
		if (updated && status === 'called') {
			await tx
				.insert(notificationDeliveries)
				.values({ visitId: updated.id, type: 'called', dedupeKey: 'called' })
				.onConflictDoNothing();
		}

		return updated ?? null;
	});
	if (visit && status === 'called') {
		await deliverPendingNotifications({ visitIds: [visit.id], types: ['called'], limit: 1 });
	}

	return visit ? Response.json(visit) : error('Visit not found.', 404);
}

export default async (request: Request) => {
	if (request.method === 'GET') {
		const unauthorized = await requireAuth0(request);
		if (unauthorized) {
			return unauthorized;
		}

		return listGuests(request);
	}
	if (request.method === 'POST') {
		return createGuest(request);
	}
	if (request.method === 'PATCH') {
		const unauthorized = await requireAuth0(request);
		if (unauthorized) {
			return unauthorized;
		}

		return updateGuest(request);
	}

	return error('Method not allowed', 405);
};

export const config = { path: '/api/guests' };
