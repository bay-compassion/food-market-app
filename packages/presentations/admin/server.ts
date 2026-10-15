/**
 * The market's server, as the admin dashboard sees it: every request the dashboard's screens make,
 * answered from the scene the guide is showing. The frame installs `fetch` as its own window's, so
 * the app's stores and API clients reach it exactly as they would reach Netlify.
 *
 * It answers reads only. The guide never lets a command reach it: a confirmation the narration
 * accepts is withdrawn on screen and the next scene carries the result, so a moment shows the same
 * however the viewer reached it (see `device.tsx`). A write arriving here is a step the guide did
 * not script, and is recorded as unanswered.
 */
import { SessionTimeline } from '../../../src/models/session-timeline.ts';
import type {
	AdminGuest,
	DatabaseGuest,
	HistoricalEvent,
	UnvisitedGuest,
} from '../../../src/services/admin-api.ts';
import type { ReportRow } from '../../../src/services/reports.ts';
import type {
	SchedulePayload,
	ScheduleSessionPayload,
} from '../../../src/services/schedule-payload.ts';
import { SessionStatusEnum } from '../../../src/services/sessionStateMachine.ts';
import type { SessionEvent, SessionOverview } from '../../../src/stores/market-session.store.ts';
import type { AdminScene, AdminSceneGuest } from './scene.ts';

const PATTERN_ID = 'guide-pattern';
const LOCATION = 'guide-location';
/** The same local time `weeks` weeks on, across any change of the clocks (a fixed 7 × 24 hours is not). */
const weeksOn = (ms: number, weeks: number) => {
	const date = new Date(ms);

	date.setDate(date.getDate() + weeks * 7);

	return date.getTime();
};
/** The question every session in the guide asks, as the schedule lists it. */
const QUESTIONS = [
	{ prompt: 'How many people are you shopping for?', type: 'text' as const, required: true },
];

/** Guests on record from earlier weeks who are not in today's session. Fictional, 555-01xx. */
const RETURNING: [string, string, string][] = [
	['Teresa', 'Alvarez', '(510) 555-0171'],
	['Omar', 'Farouk', '(510) 555-0176'],
	['Ruth', 'Bekele', '(510) 555-0183'],
];

/** The session-summary report's rows for the guide's past weeks: sign-ups, places, served. */
const PAST_WEEKS: [number, number, number, number][] = [
	[3, 26, 12, 11],
	[2, 22, 12, 12],
	[1, 31, 12, 10],
];

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const iso = (ms: number) => new Date(ms).toISOString();
/** The `YYYY-MM-DD` of a moment, in the frame's own time zone. */
const localDate = (ms: number) => {
	const date = new Date(ms);

	return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
		.map((part, i) => String(part).padStart(i ? 2 : 4, '0'))
		.join('-');
};
const localTime = (ms: number) => {
	const date = new Date(ms);

	return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export class AdminServer {
	private inFlight = 0;
	private idle: (() => void)[] = [];
	/** Requests the guide has no answer for, which `verify.ts` expects to be none. */
	readonly unexpected: string[] = [];

	constructor(public scene: AdminScene) {}

	/** Today's session, or — once it has ended — the schedule's next one, a week on. */
	private get session(): SessionEvent {
		const { market } = this.scene;
		const ended = market.status === SessionStatusEnum.ENDED;
		const timing = {
			status: ended ? SessionStatusEnum.SCHEDULED : market.status,
			registrationOpensAt: new Date(ended ? weeksOn(market.opensAt, 1) : market.opensAt),
			registrationClosesAt: new Date(
				ended ? weeksOn(market.opensAt, 1) + market.windowMinutes * 60_000 : market.closesAt,
			),
			lotteryDelayMinutes: market.lotteryDelayMinutes,
			autoCloseAfterMinutes: 720,
		};
		const timeline = new SessionTimeline(timing);

		return {
			id: ended ? 'guide-next-session' : 'guide-session',
			status: timing.status as SessionStatusEnum,
			registrationOpensAt: timing.registrationOpensAt.toISOString(),
			registrationClosesAt: timing.registrationClosesAt.toISOString(),
			registrationGraceEndsAt: timeline.graceDeadline.toISOString(),
			capacity: market.capacity,
			recurrencePatternId: PATTERN_ID,
			lotteryDelayMinutes: timing.lotteryDelayMinutes,
			autoCloseAfterMinutes: timing.autoCloseAfterMinutes,
			lotteryDrawsAt: timeline.lotteryDrawsAt?.toISOString() ?? null,
			autoClosesAt: timeline.autoClosesAt?.toISOString() ?? null,
		};
	}

	/** The market as `/api/admin/market/overview` reports it. */
	get overview(): SessionOverview {
		const event = this.session;
		const counts: SessionOverview['counts'] = {};

		if (event.id === 'guide-session') {
			for (const guest of this.scene.guests) {
				counts[guest.status] = (counts[guest.status] ?? 0) + 1;
			}
		}

		return {
			event,
			questions: QUESTIONS.map((question, i) => ({ id: `guide-question-${i}`, ...question })),
			counts,
		};
	}

	/** Today's guests, as the session's guest list reports them. */
	private get sessionGuests(): AdminGuest[] {
		if (this.scene.market.status === SessionStatusEnum.ENDED) {
			return [];
		}

		return this.scene.guests.map((guest) => this.visitOf(guest));
	}

	private visitOf(guest: AdminSceneGuest): AdminGuest {
		return {
			id: `guide-visit-${guest.n}`,
			guestId: `guide-guest-${guest.n}`,
			firstName: guest.first,
			lastName: guest.last,
			pronunciation: null,
			staffNotes: null,
			phone: guest.phone,
			householdSize: guest.household,
			locale: guest.locale,
			queuePosition: guest.queuePosition,
			priorityNumber: null,
			queueFront: false,
			queueOrder: guest.queuePosition,
			calledAt: guest.calledAt === null ? null : iso(guest.calledAt),
			status: guest.status,
			marketEventId: 'guide-session',
		};
	}

	/** Every guest on record: today's visits, then guests who have none, as the database lists them. */
	private allGuests(search: string): DatabaseGuest[] {
		const returning = RETURNING.map(
			([firstName, lastName, phone], i): UnvisitedGuest => ({
				id: null,
				guestId: `guide-returning-${i}`,
				firstName,
				lastName,
				pronunciation: null,
				staffNotes: null,
				phone,
				locale: 'en',
				status: null,
				householdSize: null,
				queuePosition: null,
				priorityNumber: null,
				queueFront: null,
				queueOrder: null,
				calledAt: null,
				marketEventId: null,
			}),
		);
		const everyone: DatabaseGuest[] = [
			...this.scene.guests.map((guest) => this.visitOf(guest)),
			...returning,
		];
		const query = search.toLowerCase();

		return everyone.filter((guest) =>
			`${guest.firstName} ${guest.lastName} ${guest.phone}`.toLowerCase().includes(query),
		);
	}

	/** Finished sessions, newest first, with today's once it has closed. */
	private get history(): HistoricalEvent[] {
		const { market } = this.scene;
		const past = [...PAST_WEEKS].reverse().map(([weeks, guestCount]) => ({
			id: `guide-past-${weeks}`,
			registrationOpensAt: iso(weeksOn(market.opensAt, -weeks)),
			registrationClosesAt: iso(weeksOn(market.opensAt, -weeks) + market.windowMinutes * 60_000),
			capacity: market.capacity,
			status: SessionStatusEnum.ENDED,
			guestCount,
		}));
		const today = {
			id: 'guide-session',
			registrationOpensAt: iso(market.opensAt),
			registrationClosesAt: iso(market.closesAt),
			capacity: market.capacity,
			status: SessionStatusEnum.ENDED,
			guestCount: this.scene.guests.length,
		};

		return this.scene.archived ? [today, ...past] : past;
	}

	/** The Schedule tab: the market's weekly pattern and its session still to come. */
	private get schedule(): SchedulePayload {
		const { market } = this.scene;
		const event = this.session;
		const session: ScheduleSessionPayload = {
			id: event.id,
			status: event.status,
			recurrencePatternId: PATTERN_ID,
			registrationOpensAt: event.registrationOpensAt,
			registrationClosesAt: event.registrationClosesAt,
			capacity: event.capacity,
			lotteryDelayMinutes: event.lotteryDelayMinutes ?? null,
			autoCloseAfterMinutes: event.autoCloseAfterMinutes ?? null,
			lotteryDrawsAt: event.lotteryDrawsAt ?? null,
			autoClosesAt: event.autoClosesAt ?? null,
			hasVisits: event.id === 'guide-session' && this.scene.guests.length > 0,
			questions: QUESTIONS,
		};

		return {
			location: {
				id: LOCATION,
				name: 'The Bay Compassion',
				// The frame's own zone, so the schedule's times read as the dashboard's do.
				timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			},
			pattern: {
				id: PATTERN_ID,
				startsOn: localDate(weeksOn(market.opensAt, -4)),
				registrationOpensAt: localTime(market.opensAt),
				registrationDurationMinutes: market.windowMinutes,
				capacity: market.capacity,
				lotteryDelayMinutes: market.lotteryDelayMinutes,
				autoCloseAfterMinutes: 720,
				questions: QUESTIONS,
			},
			sessions: [session],
		};
	}

	/** One report, over the guide's past weeks. Counts only, as the real reports are. */
	private report(id: string): Response | null {
		if (id !== 'session-summary') {
			return null;
		}

		return json({ rows: this.sessionSummary });
	}

	private get sessionSummary(): ReportRow[] {
		return PAST_WEEKS.map(([weeks, signUps, placed, served]) => ({
			sessionDate: iso(weeksOn(this.scene.market.opensAt, -weeks)),
			signUps,
			placed,
			notPlaced: signUps - placed,
			served,
			noShows: placed - served,
			walkIns: 1,
			capacity: this.scene.market.capacity,
			fillRate: (100 * placed) / this.scene.market.capacity,
		}));
	}

	readonly fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		this.inFlight += 1;

		try {
			// A turn of the event loop, as a network answer would take, so nothing settles early.
			await Promise.resolve();

			// Not a `Request`: a relative URL has nothing to resolve against inside a `srcdoc` frame.
			const url = typeof input === 'string' ? input : 'url' in input ? input.url : input.href;

			return this.answer(init?.method ?? 'GET', url);
		} finally {
			this.inFlight -= 1;

			if (this.inFlight === 0) {
				for (const resolve of this.idle.splice(0)) {
					resolve();
				}
			}
		}
	};

	/** Resolves once no request is waiting for its answer. */
	whenIdle(): Promise<void> {
		return this.inFlight === 0
			? Promise.resolve()
			: new Promise((resolve) => this.idle.push(resolve));
	}

	private answer(method: string, url: string): Response {
		const { pathname, searchParams } = new URL(url, 'https://market.invalid');
		const route = `${method.toUpperCase()} ${pathname}`;

		switch (route) {
			case 'GET /api/admin/market/overview':
				return json(this.overview);
			case 'GET /api/admin/market':
				if (searchParams.get('view') === 'history') {
					return json(this.history);
				}
				break;
			case 'GET /api/admin/guests':
				return json(
					searchParams.get('scope') === 'all'
						? this.allGuests(searchParams.get('q') ?? '')
						: this.sessionGuests,
				);
			case 'GET /api/admin/schedule':
				return json(this.schedule);
			case 'GET /api/admin/print-station':
				return json({ online: true });
			case 'GET /api/admin/reports':
				return (
					this.report(searchParams.get('report') ?? '') ?? this.notInGuide(route, searchParams)
				);
		}

		return this.notInGuide(route, searchParams);
	}

	/** An answer the guide has none for, recorded so `verify.ts` can name it. */
	private notInGuide(route: string, searchParams: URLSearchParams): Response {
		this.unexpected.push(`${route}${searchParams.size ? '?' + searchParams : ''}`);

		return json({ error: 'Not in the guide' }, 404);
	}
}
