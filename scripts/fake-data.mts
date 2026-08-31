/**
 * Builds a plausible history of market sessions, guests, and visits.
 *
 * This module is pure: it turns a seed into plain objects and never touches the database, so the
 * same `--seed` always produces the same history and the shape of the data can be unit-tested.
 * `scripts/seed-fake-data.mts` is what writes the result.
 *
 * The generated history deliberately includes the awkward cases the reports have to survive:
 * sessions that oversubscribed, guests a worker added by hand, no-shows, cancellations, and
 * visits served without a recorded time.
 */

import type { Locale } from '../src/locales.js';
import { ageRanges, type AgeRange } from '../src/services/ageRanges.js';
import type { ServiceProgress } from '../src/services/demoScenario.js';
import type { SessionMode, SessionStatus } from '../src/services/sessionStateMachine.js';
import type { VisitStatus } from '../src/services/visitStateMachine.js';

export type FakeDataOptions = {
	/** How many past weekly sessions to generate, ending one week before `now`. */
	sessions: number;
	/** How many guests exist in total. They attend at different rates, not all every week. */
	guests: number;
	/** Queue capacity per session, before a small week-to-week wobble. */
	capacity: number;
	seed: number;
	/** Adds a session open for registration today, on top of the past ones. */
	openSession: boolean;
	now: Date;
};

export type PlannedGuest = {
	id: string;
	firstName: string;
	lastName: string;
	age: number;
	phone: string;
	locale: Locale;
	createdAt: Date;
};

export type PlannedSession = {
	id: string;
	registrationOpensAt: Date;
	registrationClosesAt: Date;
	registrationGraceEndsAt?: Date | null;
	capacity: number;
	sessionMode: SessionMode;
	status: SessionStatus;
	createdAt: Date;
};

export type PlannedQuestion = {
	id: string;
	marketEventId: string;
	prompt: string;
	type: 'text' | 'scale';
	required: boolean;
	position: number;
};

export type PlannedVisit = {
	id: string;
	marketEventId: string;
	guestId: string;
	status: VisitStatus;
	queuePosition: number | null;
	lotteryWeight: number;
	ageRange: AgeRange;
	householdSize: number;
	calledAt: Date | null;
	servedAt: Date | null;
	answers: Record<string, string | number>;
	source: 'self' | 'admin';
	visitDate: string;
	isFirstVisit: boolean;
	createdAt: Date;
};

export type FakeData = {
	guests: PlannedGuest[];
	sessions: PlannedSession[];
	questions: PlannedQuestion[];
	visits: PlannedVisit[];
};

type Random = () => number;

/** Guest names by language, so a Spanish-speaking guest is not called Margaret Hill. */
const namesByLocale: Record<Locale, { first: string[]; last: string[] }> = {
	en: {
		first: ['Alice', 'Marcus', 'Denise', 'Terrance', 'Gloria', 'Wesley', 'Priya', 'Naomi'],
		last: ['Hill', 'Whitfield', 'Okafor', 'Brennan', 'Alvarez', 'Sinclair', 'Boateng'],
	},
	es: {
		first: ['Rosa', 'Javier', 'Lucía', 'Ernesto', 'Marisol', 'Ignacio', 'Beatriz', 'Camilo'],
		last: ['Ramírez', 'Delgado', 'Cifuentes', 'Peralta', 'Navarro', 'Quintero', 'Escobar'],
	},
	fa: {
		first: ['نسرین', 'فرهاد', 'شیرین', 'کامران', 'مینا', 'بهرام', 'ژاله', 'سیاوش'],
		last: ['موسوی', 'کریمی', 'شریفی', 'نجفی', 'رستمی', 'اسدی', 'زمانی'],
	},
	tl: {
		first: ['Imelda', 'Rogelio', 'Corazon', 'Bayani', 'Liwayway', 'Emmanuel', 'Divina'],
		last: ['Bautista', 'Villanueva', 'Macaraeg', 'Panganiban', 'Dimaculangan', 'Sarmiento'],
	},
	vi: {
		first: ['Thanh', 'Hoàng', 'Mỹ Linh', 'Quốc', 'Bích', 'Tuấn', 'Ngọc Anh', 'Kiều'],
		last: ['Nguyễn', 'Trần', 'Phạm', 'Huỳnh', 'Đặng', 'Vũ', 'Bùi'],
	},
	zh: {
		first: ['秀英', '建国', '丽华', '志强', '桂芳', '晓明', '婉如', '国栋'],
		last: ['陈', '黄', '林', '郑', '梁', '谢', '罗'],
	},
	ar: {
		first: ['سميرة', 'خالد', 'نادية', 'رامي', 'هدى', 'عمر', 'ليلى', 'ياسر'],
		last: ['الحسن', 'الخوري', 'منصور', 'الصايغ', 'حداد', 'العتيبي', 'شاهين'],
	},
};

/** Roughly the mix the market sees, so reports are not an even split across seven languages. */
const localeShares: [Locale, number][] = [
	['en', 40],
	['es', 28],
	['vi', 10],
	['zh', 8],
	['tl', 6],
	['fa', 5],
	['ar', 3],
];

/** The tiers a worker can pick from, at the rate a worker realistically picks them. */
const lotteryWeightShares: [number, number][] = [
	[1, 84],
	[2, 12],
	[5, 4],
];

const questionPrompts: { prompt: string; type: 'text' | 'scale'; required: boolean }[] = [
	{ prompt: 'How did you travel here today?', type: 'text', required: false },
	{ prompt: 'How easy was it to sign up this week?', type: 'scale', required: false },
];

const travelAnswers = ['Bus', 'Walked', 'Drove', 'Ride from a neighbour', 'Bicycle', 'Rideshare'];

/** A small, fast seeded generator (mulberry32) so a given seed always replays the same history. */
export function createRandom(seed: number): Random {
	let state = seed >>> 0;

	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let value = Math.imul(state ^ (state >>> 15), 1 | state);

		value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;

		return ((value ^ (value >>> 14)) >>> 0) / 2 ** 32;
	};
}

function integerBetween(random: Random, minimum: number, maximum: number) {
	return minimum + Math.floor(random() * (maximum - minimum + 1));
}

function pick<T>(random: Random, items: readonly T[]) {
	return items[Math.floor(random() * items.length)]!;
}

function chance(random: Random, probability: number) {
	return random() < probability;
}

function pickShare<T>(random: Random, shares: [T, number][]) {
	const total = shares.reduce((sum, [, share]) => sum + share, 0);
	let target = random() * total;

	for (const [value, share] of shares) {
		target -= share;

		if (target <= 0) {
			return value;
		}
	}

	return shares[shares.length - 1]![0];
}

/**
 * The same draw the real lottery runs — see `weightedShuffle` in
 * `netlify/services/marketSession.ts` — but on the seeded generator. Doubling an item's weight
 * really doubles its odds of coming out ahead, rather than merely sorting it earlier.
 */
function weightedShuffle<T>(items: T[], weightOf: (item: T) => number, random: Random) {
	return items
		.map((item) => ({ item, key: random() ** (1 / Math.max(1, weightOf(item))) }))
		.sort((first, second) => second.key - first.key)
		.map(({ item }) => item);
}

function atHour(day: Date, hour: number) {
	const date = new Date(day);

	date.setHours(hour, 0, 0, 0);

	return date;
}

function daysBefore(date: Date, days: number) {
	const result = new Date(date);

	result.setDate(result.getDate() - days);

	return result;
}

function minutesAfter(date: Date, minutes: number) {
	return new Date(date.valueOf() + minutes * 60_000);
}

/** The `date` column wants a calendar day in local time, not a UTC-shifted `toISOString()`. */
function calendarDay(date: Date) {
	const month = `${date.getMonth() + 1}`.padStart(2, '0');
	const day = `${date.getDate()}`.padStart(2, '0');

	return `${date.getFullYear()}-${month}-${day}`;
}

function buildGuests(options: { guests: number; now: Date }, random: Random) {
	return Array.from({ length: options.guests }, (_unused, index) => {
		const locale = pickShare(random, localeShares);
		const names = namesByLocale[locale];
		// A 555 number is never a real one, and the shared prefix makes seeded guests easy to spot.
		const exchange = 100 + Math.floor(index / 100);
		const line = `${index % 100}`.padStart(2, '0');
		const phone = `(555) ${exchange}-${line}${integerBetween(random, 10, 99)}`;

		return {
			id: crypto.randomUUID(),
			firstName: pick(random, names.first),
			lastName: pick(random, names.last),
			age: integerBetween(random, 19, 84),
			phone,
			locale,
			createdAt: options.now,
		} satisfies PlannedGuest;
	});
}

/** Household composition is a per-visit detail now, not part of the guest record — see
 *  `20260826120000_move_household_composition_to_visits`. Picked fresh for each visit. */
function pickHouseholdComposition(random: Random) {
	return {
		ageRange: pick(random, ageRanges),
		householdSize: pickShare(random, [
			[1, 22],
			[2, 26],
			[3, 20],
			[4, 15],
			[5, 9],
			[6, 5],
			[8, 3],
		]),
	};
}

function buildSession(
	options: FakeDataOptions,
	weeksAgo: number,
	random: Random,
): { session: PlannedSession; serviceStartsAt: Date } {
	const day = daysBefore(options.now, weeksAgo * 7);
	const registrationOpensAt = atHour(day, 9);

	return {
		session: {
			id: crypto.randomUUID(),
			registrationOpensAt,
			registrationClosesAt: atHour(day, 11),
			capacity: options.capacity + integerBetween(random, -5, 5),
			sessionMode: 'scheduled',
			status: 'ended',
			createdAt: daysBefore(registrationOpensAt, 3),
		},
		serviceStartsAt: atHour(day, 12),
	};
}

function buildQuestions(session: PlannedSession) {
	return questionPrompts.map((question, position) => ({
		id: crypto.randomUUID(),
		marketEventId: session.id,
		position,
		...question,
	})) satisfies PlannedQuestion[];
}

function buildAnswers(questions: PlannedQuestion[], random: Random) {
	if (!chance(random, 0.7)) {
		return {};
	}

	return Object.fromEntries(
		questions.map((question) => [
			question.id,
			question.type === 'scale' ? integerBetween(random, 4, 10) : pick(random, travelAnswers),
		]),
	);
}

/**
 * Decides how a placed guest's visit ended, and when. `unrecorded` visits are the ones served
 * before the session tracked timings, or written down after the fact — the service-timing report
 * counts them separately, so the seed has to produce some.
 */
function resolvePlacedVisit(serviceStartsAt: Date, position: number, random: Random) {
	const calledAt = minutesAfter(serviceStartsAt, position * 1.6 + integerBetween(random, 0, 4));

	if (chance(random, 0.09)) {
		return {
			status: 'no_show' as VisitStatus,
			calledAt: chance(random, 0.5) ? calledAt : null,
			servedAt: null,
		};
	}

	if (chance(random, 0.06)) {
		return { status: 'served' as VisitStatus, calledAt: null, servedAt: null };
	}
	const wait = chance(random, 0.12)
		? integerBetween(random, 20, 40)
		: integerBetween(random, 2, 15);

	return {
		status: 'served' as VisitStatus,
		calledAt,
		servedAt: minutesAfter(calledAt, wait),
	};
}

type PlacementOutcome = { status: VisitStatus; calledAt: Date | null; servedAt: Date | null };

/**
 * The shape of a session where the lottery has run: who signed up, who the draw placed, and how
 * their visit ended. Walk-ins are added by a worker during service, so they hold the first queue
 * positions and the draw fills what capacity is left behind them — the same order `runLottery`
 * produces. `resolveOutcome` decides what happens to a placed visit, and is the only thing that
 * differs between a finished session (`buildSessionVisits`) and one still mid-service
 * (`buildInProgressVisits`).
 */
function buildDrawnVisits(
	session: PlannedSession,
	serviceStartsAt: Date,
	questions: PlannedQuestion[],
	attendees: PlannedGuest[],
	resolveOutcome: (position: number, placedCount: number, random: Random) => PlacementOutcome,
	random: Random,
) {
	const walkInCount = Math.round(attendees.length * 0.06);
	const walkIns = attendees.slice(0, walkInCount);
	const registrants = attendees.slice(walkInCount);
	const visitDate = calendarDay(session.registrationOpensAt);
	const visits: PlannedVisit[] = [];

	const entries = registrants.map((guest) => ({
		guest,
		lotteryWeight: pickShare(random, lotteryWeightShares),
		cancelled: chance(random, 0.03),
	}));
	const drawn = weightedShuffle(
		entries.filter((entry) => !entry.cancelled),
		(entry) => entry.lotteryWeight,
		random,
	);
	const placedCount = Math.max(0, session.capacity - walkIns.length);

	for (const [index, guest] of walkIns.entries()) {
		const outcome = resolveOutcome(index, placedCount, random);

		visits.push({
			id: crypto.randomUUID(),
			marketEventId: session.id,
			guestId: guest.id,
			queuePosition: index + 1,
			lotteryWeight: 1,
			...pickHouseholdComposition(random),
			answers: {},
			source: 'admin',
			visitDate,
			isFirstVisit: false,
			createdAt: minutesAfter(serviceStartsAt, integerBetween(random, 0, 60)),
			...outcome,
		});
	}

	for (const [index, entry] of drawn.entries()) {
		const placed = index < placedCount;
		const position = walkIns.length + index + 1;
		const outcome = placed
			? resolveOutcome(position, placedCount, random)
			: { status: 'not_placed' as VisitStatus, calledAt: null, servedAt: null };

		visits.push({
			id: crypto.randomUUID(),
			marketEventId: session.id,
			guestId: entry.guest.id,
			queuePosition: placed ? position : null,
			lotteryWeight: entry.lotteryWeight,
			...pickHouseholdComposition(random),
			answers: buildAnswers(questions, random),
			source: 'self',
			visitDate,
			isFirstVisit: false,
			createdAt: minutesAfter(session.registrationOpensAt, integerBetween(random, 0, 115)),
			...outcome,
		});
	}

	for (const entry of entries.filter((candidate) => candidate.cancelled)) {
		visits.push({
			id: crypto.randomUUID(),
			marketEventId: session.id,
			guestId: entry.guest.id,
			status: 'cancelled',
			queuePosition: null,
			lotteryWeight: entry.lotteryWeight,
			...pickHouseholdComposition(random),
			calledAt: null,
			servedAt: null,
			answers: buildAnswers(questions, random),
			source: 'self',
			visitDate,
			isFirstVisit: false,
			createdAt: minutesAfter(session.registrationOpensAt, integerBetween(random, 0, 115)),
		});
	}

	return visits;
}

/** One past session's worth of visits, fully resolved: nothing is left `waiting` or `called`. */
function buildSessionVisits(
	session: PlannedSession,
	serviceStartsAt: Date,
	questions: PlannedQuestion[],
	attendees: PlannedGuest[],
	random: Random,
) {
	return buildDrawnVisits(
		session,
		serviceStartsAt,
		questions,
		attendees,
		(position, _unusedPlacedCount, rand) => resolvePlacedVisit(serviceStartsAt, position, rand),
		random,
	);
}

/**
 * Decides how a placed guest's visit stands partway through service. Queue positions before
 * `progress * placedCount` have already been resolved, same as a finished session; a small band
 * right at that point is `called` — guests currently at the table; everyone after is still
 * `waiting`. Mirrors `resolvePlacedVisit`'s timing so the two blend together at the boundary.
 */
function resolveInProgressVisit(
	serviceStartsAt: Date,
	position: number,
	placedCount: number,
	progress: number,
	random: Random,
): PlacementOutcome {
	const threshold = progress * placedCount;

	if (position < threshold) {
		return resolvePlacedVisit(serviceStartsAt, position, random);
	}
	const calledBandWidth = Math.max(1, Math.round(placedCount * 0.05));

	if (position < threshold + calledBandWidth) {
		return {
			status: 'called',
			calledAt: minutesAfter(serviceStartsAt, position * 1.6 + integerBetween(random, 0, 4)),
			servedAt: null,
		};
	}

	return { status: 'waiting', calledAt: null, servedAt: null };
}

/** A session mid-service: the queue has drained up to `progress`, and the rest are still waiting. */
function buildInProgressVisits(
	session: PlannedSession,
	serviceStartsAt: Date,
	questions: PlannedQuestion[],
	attendees: PlannedGuest[],
	progress: number,
	random: Random,
) {
	return buildDrawnVisits(
		session,
		serviceStartsAt,
		questions,
		attendees,
		(position, placedCount, rand) =>
			resolveInProgressVisit(serviceStartsAt, position, placedCount, progress, rand),
		random,
	);
}

/** Today's session, still taking sign-ups: everyone is `registered` and nobody has a position. */
function buildOpenSession(options: FakeDataOptions, random: Random) {
	const registrationOpensAt = minutesAfter(options.now, -45);

	return {
		id: crypto.randomUUID(),
		registrationOpensAt,
		registrationClosesAt: minutesAfter(options.now, 90),
		capacity: options.capacity + integerBetween(random, -5, 5),
		sessionMode: 'scheduled',
		status: 'registration_open',
		createdAt: daysBefore(registrationOpensAt, 2),
	} satisfies PlannedSession;
}

function buildOpenSessionVisits(
	session: PlannedSession,
	questions: PlannedQuestion[],
	attendees: PlannedGuest[],
	now: Date,
	random: Random,
) {
	const visitDate = calendarDay(now);

	return attendees.map((guest) => ({
		id: crypto.randomUUID(),
		marketEventId: session.id,
		guestId: guest.id,
		status: 'registered' as VisitStatus,
		queuePosition: null,
		lotteryWeight: pickShare(random, lotteryWeightShares),
		...pickHouseholdComposition(random),
		calledAt: null,
		servedAt: null,
		answers: buildAnswers(questions, random),
		source: 'self' as const,
		visitDate,
		isFirstVisit: false,
		createdAt: new Date(
			session.registrationOpensAt.valueOf() +
				random() * (now.valueOf() - session.registrationOpensAt.valueOf()),
		),
	}));
}

/**
 * Picks who turns up this week. Each guest carries a loyalty weight, so the same faces recur
 * across sessions and a long tail shows up once or twice — which is what makes the repeat-visit
 * and unique-guest columns in the reports mean anything.
 */
function pickAttendees(
	guests: PlannedGuest[],
	loyalty: Map<string, number>,
	count: number,
	random: Random,
) {
	return weightedShuffle(guests, (guest) => loyalty.get(guest.id) ?? 1, random).slice(0, count);
}

export function buildFakeData(options: FakeDataOptions): FakeData {
	const random = createRandom(options.seed);
	const guests = buildGuests(options, random);
	const loyalty = new Map(guests.map((guest) => [guest.id, integerBetween(random, 1, 6)]));
	const sessions: PlannedSession[] = [];
	const questions: PlannedQuestion[] = [];
	const visits: PlannedVisit[] = [];

	// Oldest first, so the first time a guest appears is the visit marked as their first.
	for (let weeksAgo = options.sessions; weeksAgo >= 1; weeksAgo -= 1) {
		const { session, serviceStartsAt } = buildSession(options, weeksAgo, random);
		const sessionQuestions = buildQuestions(session);
		const signUps = Math.round(session.capacity * (0.9 + random() * 0.7));
		const attendees = pickAttendees(guests, loyalty, signUps, random);

		sessions.push(session);
		questions.push(...sessionQuestions);
		visits.push(
			...buildSessionVisits(session, serviceStartsAt, sessionQuestions, attendees, random),
		);
	}

	if (options.openSession) {
		const session = buildOpenSession(options, random);
		const sessionQuestions = buildQuestions(session);
		const attendees = pickAttendees(guests, loyalty, Math.round(session.capacity * 0.8), random);

		sessions.push(session);
		questions.push(...sessionQuestions);
		visits.push(
			...buildOpenSessionVisits(session, sessionQuestions, attendees, options.now, random),
		);
	}

	const firstVisits = new Map<string, PlannedVisit>();

	for (const visit of visits) {
		const earliest = firstVisits.get(visit.guestId);

		if (!earliest || visit.createdAt < earliest.createdAt) {
			firstVisits.set(visit.guestId, visit);
		}
	}

	for (const visit of firstVisits.values()) {
		visit.isFirstVisit = true;
	}
	// A guest record exists from just before the first time they signed up. Anyone the draw of
	// attendees never picked is backdated to before the history starts.
	const historyStartsAt = sessions[0]?.registrationOpensAt ?? options.now;

	for (const guest of guests) {
		const first = firstVisits.get(guest.id);

		guest.createdAt = first
			? minutesAfter(first.createdAt, -2)
			: daysBefore(historyStartsAt, integerBetween(random, 30, 400));
	}

	return { guests, sessions, questions, visits };
}

export type ScenarioOptions = {
	/** Where on the session lifecycle to stage the scenario. */
	stage: SessionStatus;
	/** How far through service the queue is. Only read when `stage` is `service_started`. */
	serviceProgress?: ServiceProgress;
	/** Ignored (treated as 0) for `draft` and `scheduled` — nobody can have registered yet. */
	guests: number;
	capacity: number;
	seed: number;
	now: Date;
};

const progressFractions: Record<ServiceProgress, number> = {
	just_started: 0.1,
	halfway: 0.5,
	nearly_done: 0.9,
};

/**
 * Timing anchored relative to `now`, unlike the fixed clock hours `buildSession` uses for weekly
 * history — so a loaded scenario looks fresh regardless of what time of day it is loaded.
 */
function scenarioTiming(stage: SessionStatus, now: Date) {
	const serviceStartsAt = minutesAfter(now, -80);

	switch (stage) {
		case 'draft':
			// Not committed to a time yet, but the settings form needs something to show.
			return {
				registrationOpensAt: minutesAfter(now, 24 * 60),
				registrationClosesAt: minutesAfter(now, 24 * 60 + 120),
				serviceStartsAt,
			};
		case 'scheduled':
			return {
				registrationOpensAt: minutesAfter(now, 45),
				registrationClosesAt: minutesAfter(now, 45 + 120),
				serviceStartsAt,
			};
		case 'registration_open':
			return {
				registrationOpensAt: minutesAfter(now, -30),
				registrationClosesAt: minutesAfter(now, 60),
				serviceStartsAt,
			};
		default:
			// registration_closed, lottery_pending, service_started, ended: the public window is over.
			return {
				registrationOpensAt: minutesAfter(now, -180),
				registrationClosesAt: minutesAfter(now, -90),
				serviceStartsAt,
			};
	}
}

/**
 * One session staged at a chosen point on the lifecycle, with guests and visits that look like
 * that exact moment — what the dev-mode data loader (`netlify/services/demoScenario.mts`) uses to
 * replace whatever session is currently live, for demos and screenshots. Unlike `buildFakeData`'s
 * multi-week history, this always produces exactly one session.
 */
export function buildScenario(options: ScenarioOptions): FakeData {
	const { stage, now, capacity } = options;
	const random = createRandom(options.seed);
	const guestCount = stage === 'draft' || stage === 'scheduled' ? 0 : options.guests;
	const guests = buildGuests({ guests: guestCount, now }, random);
	const { registrationOpensAt, registrationClosesAt, serviceStartsAt } = scenarioTiming(stage, now);

	const session: PlannedSession = {
		id: crypto.randomUUID(),
		registrationOpensAt,
		registrationClosesAt,
		capacity,
		sessionMode: 'scheduled',
		status: stage,
		registrationGraceEndsAt:
			stage === 'registration_closed'
				? minutesAfter(now, 0.5)
				: stage === 'lottery_pending'
					? minutesAfter(now, -1)
					: null,
		createdAt: daysBefore(registrationOpensAt, 2),
	};
	const questions = buildQuestions(session);

	let visits: PlannedVisit[] = [];

	if (stage === 'registration_open') {
		visits = buildOpenSessionVisits(session, questions, guests, now, random);
	} else if (stage === 'registration_closed' || stage === 'lottery_pending') {
		visits = buildOpenSessionVisits(session, questions, guests, registrationClosesAt, random);
	} else if (stage === 'service_started') {
		const progress = progressFractions[options.serviceProgress ?? 'halfway'];

		visits = buildInProgressVisits(session, serviceStartsAt, questions, guests, progress, random);
	} else if (stage === 'ended') {
		visits = buildSessionVisits(session, serviceStartsAt, questions, guests, random);
	}

	// Every guest exists from just before their one visit here — or, for anyone the lottery shut
	// out entirely, some plausible time before the scenario starts.
	for (const guest of guests) {
		const visit = visits.find((candidate) => candidate.guestId === guest.id);

		if (visit) {
			visit.isFirstVisit = true;
			guest.createdAt = minutesAfter(visit.createdAt, -2);
		} else {
			guest.createdAt = daysBefore(now, integerBetween(random, 30, 400));
		}
	}

	return { guests, sessions: [session], questions, visits };
}
