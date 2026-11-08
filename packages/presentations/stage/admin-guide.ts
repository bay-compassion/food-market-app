/**
 * What every guide on the admin dashboard shares: the dashboard in a frame on the stage's phone, the
 * fictional market it shows, the helpers its beat script is written with — a line's caption and
 * what it points at, a tap, moving to another screen, a confirmation, typing — and the timeline and
 * player around them. A guide's own `page.ts` holds only its chapters and its beat script.
 *
 * The build inlines this file for a video whose `frame` is `admin`, after the page's script and
 * before the stage, filling in the frame's page and the dashboard's English copy. Like the stage, it
 * imports nothing at runtime; a page reaches it through `window.adminGuide` once the document has
 * loaded.
 *
 * Every moment is a scene the frame can build from nothing, so a guide re-renders against whatever
 * the dashboard looks like today: change a screen, rebuild, and the guide shows the new one. What
 * the narration points at is named by the dashboard's own copy (`AdminMark`), and `verify.ts` fails
 * when the screen stops showing one.
 */
import type { AdminTranslation } from '../../../src/adminLocales.ts';
import type { Locale } from '../../../src/locales.ts';
import type { AdminView } from '../../../src/services/admin-views.ts';
import type { SessionStatus } from '../../../src/services/sessionStateMachine.ts';
import type {
	AdminHandle,
	AdminMark,
	AdminRole,
	AdminScene,
	AdminSceneGuest,
	AdminSceneGuestForm,
} from '../admin/scene.ts';
import type { TimedLine } from './reel.ts';
import type { Caption } from './stage.ts';

/** The admin frame's page, built from `admin/` by `build.ts`. */
declare const __FRAME__: string;
/** The dashboard's English copy, from `src/adminLocales.ts`, so captions name what it names. */
declare const __ADMIN_COPY__: AdminTranslation;

export interface AdminGuideState {
	phase: 'title' | 'phone' | 'outro';
	title: boolean;
	phone: boolean;
	outro: boolean;
	cap: Caption | null;
	view: AdminView;
	status: SessionStatus;
	/** The frame's clock, `HH:MM:SS` on market day. */
	time: string;
	closesAt: string;
	capacity: number;
	archived: boolean;
	guests: AdminSceneGuest[];
	confirm: AdminMark | null;
	addGuest: AdminSceneGuestForm | null;
	broadcast: { title: string; body: string };
	/** The Checklist steps ticked off by hand. */
	checklist: string[];
	/** Whether the More sheet of screens is open. */
	navigating: boolean;
	focus: AdminMark | null;
	tap: AdminMark | null;
	scrollTo: AdminMark | null;
}

type Beat = (s: AdminGuideState) => void;

export interface AdminGuideOptions {
	/** The timeline's name in `#dev`. */
	name: string;
	/** The page's script, as `#dev` names it beside each beat. */
	source: string;
	narration: TimedLine[];
	/** Chapter titles, by the `chapter` key on the narration line each one starts at. */
	chapters: Record<string, string>;
	/** Who is signed in to the dashboard. */
	role: AdminRole;
	/** Where the guide starts, before its first beat. */
	initial?: Partial<AdminGuideState>;
}

/** The Saturday a guide happens on, for the frame's clock. */
const MARKET_DAY = '2026-10-31';
const clockAt = (time: string) =>
	new Date(`${MARKET_DAY}T${time.length === 5 ? time + ':00' : time}`).getTime();

/**
 * The phone's tabs for each role, as `AdminNavigation.tabs` lays them out for its screens: a team
 * leader has no guest database, so only the session and the queue have tabs.
 */
const TAB_VIEWS: Record<AdminRole, AdminView[]> = {
	coordinator: ['current-session', 'queue', 'guest-database'],
	'team-leader': ['current-session', 'queue'],
};

/* ================= the market ================= */

// Fictional guests, in the order they register; phone numbers use the reserved 555-01xx range.
const PEOPLE: [string, string, Locale, number][] = [
	['Luis', 'Herrera', 'es', 3],
	['Mai', 'Nguyen', 'vi', 2],
	['Grace', 'Okafor', 'en', 1],
	['Wei', 'Chen', 'zh', 4],
	['Amal', 'Haddad', 'ar', 5],
	['Josefina', 'Reyes', 'tl', 2],
	['Reza', 'Karimi', 'fa', 2],
	['Claire', 'Dubois', 'fr', 3],
	['Ana', 'Morales', 'es', 4],
	['Daniel', 'Brooks', 'en', 1],
	['Linh', 'Tran', 'vi', 3],
	['Carmen', 'Ruiz', 'es', 2],
	['Hassan', 'Nouri', 'fa', 5],
	['Mei', 'Lin', 'zh', 2],
	['Samuel', 'Ortega', 'es', 3],
	['Huong', 'Vo', 'vi', 2],
];
/** The order the draw places them in, by registration order; the rest are not placed. */
const DRAWN = [5, 1, 12, 8, 3, 14, 10, 2, 7, 16, 4, 9];
const CAPACITY = 12;
/** A guest added by hand during service, who joins the end of the line. */
const WALK_IN: AdminSceneGuest = {
	n: PEOPLE.length + 1,
	first: 'Rosa',
	last: 'Mendoza',
	phone: '(510) 555-0187',
	locale: 'es',
	household: 3,
	status: 'waiting',
	queuePosition: CAPACITY + 1,
	calledAt: null,
};
/** The add-guest dialog as it opens, before anything is typed. */
const BLANK_GUEST: AdminSceneGuestForm = {
	firstName: '',
	lastName: '',
	phone: '',
	ageRange: '',
	householdSize: '',
	childrenCount: '',
	seniorsCount: '',
};

const guest = (s: AdminGuideState, n: number) => s.guests.find((x) => x.n === n)!;

/** Guest `n` (from 1, in `PEOPLE`) signs up. */
function register(s: AdminGuideState, n: number) {
	const [first, last, locale, household] = PEOPLE[n - 1]!;

	s.guests.push({
		n,
		first,
		last,
		phone: `(510) 555-01${String(10 + n * 3).padStart(2, '0')}`,
		locale,
		household,
		status: 'registered',
		queuePosition: null,
		calledAt: null,
	});
}

/** The lottery places `DRAWN` in order and leaves everyone else unplaced; service starts. */
function draw(s: AdminGuideState) {
	s.status = 'service_started';
	DRAWN.forEach((n, i) => {
		guest(s, n).status = 'waiting';
		guest(s, n).queuePosition = i + 1;
	});
	s.guests.filter((x) => x.status === 'registered').forEach((x) => (x.status = 'not_placed'));
}

/** An hour into service: five served, one missed, two called a few minutes ago. */
function midService(s: AdminGuideState) {
	s.time = '11:52';
	DRAWN.slice(0, 5).forEach((n) => (guest(s, n).status = 'served'));
	guest(s, DRAWN[5]!).status = 'no_show';
	DRAWN.slice(6, 8).forEach((n) => {
		guest(s, n).status = 'called';
		guest(s, n).calledAt = clockAt('11:49');
	});
}

/** Everyone placed has come up by the time the market closes. */
function everyoneServed(s: AdminGuideState) {
	s.guests
		.filter((x) => x.status === 'called' || x.status === 'waiting')
		.forEach((x) => (x.status = 'served'));
}

const market = {
	PEOPLE,
	CAPACITY,
	WALK_IN,
	BLANK_GUEST,
	guest,
	register,
	draw,
	midService,
	everyoneServed,
};

/* ================= the guide ================= */

/**
 * Starts a guide: puts the dashboard on the stage's phone and hands back the market, the narration's
 * cues, and the helpers a beat script is written with. Once the script is written, `finish(END)`
 * builds the timeline and the player around it.
 */
function create(options: AdminGuideOptions) {
	const { k, one, beatScript, snapshotAt, narrationCues, phoneFrame, renderCaption, mountPlayer } =
		window.stage;
	const { cues, chapters, C, E } = narrationCues(options.narration);
	const tabViews = TAB_VIEWS[options.role];

	const phone = phoneFrame('9:58');
	const app = one(phone, '.app');
	const frame = document.createElement('iframe');

	phone.id = 'adminPhone';
	// An illustration: the narration and captions carry what it shows, and a viewer's own taps
	// would take it off the script.
	frame.setAttribute('aria-hidden', 'true');
	frame.tabIndex = -1;
	frame.style.pointerEvents = 'none';
	frame.srcdoc = __FRAME__;
	app.appendChild(frame);
	k('phoneMotion').appendChild(phone);

	// A dashboard that never starts fails here, by name, rather than leaving capture waiting.
	const frameReady = new Promise<AdminHandle>((resolve, reject) => {
		frame.addEventListener('load', () => {
			const handle = frame.contentWindow?.admin;

			if (handle) {
				void handle.ready.then(() => resolve(handle));
			} else {
				reject(new Error('The admin frame did not start; its frame logged why.'));
			}
		});
	});

	frameReady.catch((error: unknown) => console.error(error));

	const initial: AdminGuideState = {
		phase: 'title',
		title: true,
		phone: false,
		outro: false,
		cap: null,
		view: 'current-session',
		status: 'scheduled',
		time: '09:58',
		closesAt: '10:45',
		capacity: CAPACITY,
		archived: false,
		guests: [],
		confirm: null,
		addGuest: null,
		broadcast: { title: '', body: '' },
		checklist: [],
		navigating: false,
		focus: null,
		tap: null,
		scrollTo: null,
		...options.initial,
	};
	const { at, snapshots } = beatScript(initial);

	/** A caption and what the narration points at, as a line starts. */
	const line = (
		id: string,
		cap: [string, string, string],
		focus: AdminMark | null = null,
		scrollTo: AdminMark | null = focus,
	) =>
		at(C(id), (s) => {
			s.cap = { eyebrow: cap[0], head: cap[1], sub: cap[2] };
			s.focus = focus;
			s.scrollTo = scrollTo;
		});
	const tap = (t: number, target: AdminMark, action?: Beat) => {
		at(t, (s) => {
			s.tap = target;
			s.focus = null;
		});
		at(t + 0.4, (s) => {
			s.tap = null;
			action?.(s);
		});
	};
	/**
	 * Moves to another screen as a worker does on a phone: a tap on its tab, or on More and then on
	 * the screen in the sheet. The new screen starts at its top.
	 */
	const go = (t: number, view: AdminView, action?: Beat) => {
		const hasTab = tabViews.includes(view);

		at(t, (s) => {
			s.tap = hasTab ? `tab:${view}` : 'switcher';
			s.focus = null;
		});

		if (!hasTab) {
			at(t + 0.25, (s) => {
				s.tap = null;
				s.navigating = true;
			});
			at(t + 0.4, (s) => {
				s.tap = `tab:${view}`;
			});
		}
		at(t + 0.7, (s) => {
			s.tap = null;
			s.navigating = false;
			s.view = view;
			s.scrollTo = null;
			action?.(s);
		});
	};
	const order = [...cues.keys()];
	/** Just before line `id`, in the pause after the line before it: where a new screen is opened. */
	const before = (id: string) => {
		const previous = order[order.indexOf(id) - 1];

		return Math.max(previous ? E(previous) + 0.05 : 0, C(id) - 0.9);
	};
	/** A confirmation: the button that asks, then the sheet's own button that agrees. */
	const confirm = (t: number, ask: AdminMark, agree: AdminMark, then: Beat, gap = 1.6) => {
		tap(t, ask, (s) => {
			s.confirm = ask;
			s.scrollTo = null;
		});
		tap(t + gap, agree, (s) => {
			s.confirm = null;
			then(s);
		});
	};
	const type = (
		start: number,
		value: string,
		write: (s: AdminGuideState, text: string) => void,
		pace = 0.06,
	) => {
		for (let i = 1; i <= value.length; i++) {
			at(start + i * pace, (s) => write(s, value.slice(0, i)));
		}
	};
	/** The title card gives way to the phone as line `id` starts. */
	const openPhone = (id: string, time: string) =>
		at(C(id), (s) => {
			s.title = false;
			s.phone = true;
			s.phase = 'phone';
			s.time = time;
		});
	/** The phone gives way to the closing card as line `id` ends. */
	const closePhone = (id: string) => {
		at(C(id), (s) => {
			s.cap = null;
			s.focus = null;
		});
		at(E(id), (s) => {
			s.phone = false;
			s.outro = true;
			s.phase = 'outro';
		});
	};

	/** Builds the timeline from the beat script, and the player around it. */
	function finish(END: number) {
		const snaps = snapshots();

		/** When each snapshot's clock was last set, so the frame's clock runs on from there. */
		const clockSetAt = snaps.reduce<number[]>((list, snap, i) => {
			const prev = snaps[i - 1];

			list.push(prev && prev.s.time === snap.s.time ? list[i - 1]! : snap.t);

			return list;
		}, []);

		/** What the dashboard shows at `time`, in snapshot `i`. */
		function sceneAt(i: number, time: number): AdminScene {
			const s = snaps[i]!.s;

			return {
				role: options.role,
				now: clockAt(s.time) + Math.max(0, Math.floor(time - clockSetAt[i]!)) * 1000,
				view: s.view,
				market: {
					status: s.status,
					opensAt: clockAt('10:30'),
					closesAt: clockAt(s.closesAt),
					capacity: s.capacity,
					windowMinutes: 15,
					lotteryDelayMinutes: 5,
				},
				guests: s.guests,
				archived: s.archived,
				navigating: s.navigating,
				confirm: s.confirm,
				addGuest: s.addGuest,
				broadcast: s.broadcast,
				checklist: s.checklist,
				focus: s.focus,
				tap: s.tap,
				scrollTo: s.scrollTo ?? s.focus,
			};
		}

		let handle: AdminHandle | null = null;
		let shownScene = '';
		let lastTime = 0;

		/** Hands the dashboard the scene at `time`; anything but forward play starts it over. */
		function showFrame(i: number, time: number, jumped: boolean) {
			const scene = sceneAt(i, time);
			const json = JSON.stringify(scene);
			const continuous = !jumped && time >= lastTime && time - lastTime < 0.5;

			lastTime = time;

			if (handle && (json !== shownScene || !continuous)) {
				shownScene = json;
				handle.show(scene, continuous);
			}
		}

		let lastIndex = -1;

		function renderAt(time: number, force = false) {
			const i = snapshotAt(snaps, time);
			const s = snaps[i]!.s;

			if (force || i !== lastIndex) {
				lastIndex = i;
				k('stage').dataset.phase = s.phase;

				for (const [id, visible] of [
					['phoneMotion', s.phone],
					['title', s.title],
					['outro', s.outro],
				] as const) {
					k(id).setAttribute('aria-hidden', String(!visible));
				}
				renderCaption(s);
				one(phone, '.statusbar > span').textContent = new Date(clockAt(s.time))
					.toLocaleTimeString('en-US', {
						hour: 'numeric',
						minute: '2-digit',
					})
					.replace(/\s?[AP]M$/, '');
			}
			showFrame(i, time, force);
		}

		const tl = gsap.timeline({
			id: options.name,
			paused: true,
			onUpdate: () => renderAt(tl.time()),
		});

		gsap.set('#phoneMotion', { opacity: 0 });
		tl.fromTo(
			'#title .wordmark',
			{ opacity: 0, y: 30, scale: 0.94 },
			{ opacity: 1, y: 0, scale: 1, duration: 1.1, ease: 'power3.out' },
			0.2,
		);
		tl.fromTo(
			'#title .line, #title .sub',
			{ opacity: 0, y: 24 },
			{
				opacity: 1,
				y: 0,
				duration: 0.9,
				stagger: 0.25,
				ease: 'power3.out',
			},
			0.9,
		);

		for (let i = 1; i < snaps.length; i++) {
			const { t, s } = snaps[i]!,
				prev = snaps[i - 1]!.s;

			if (prev.phone !== s.phone) {
				tl.fromTo(
					'#phoneMotion',
					{ opacity: s.phone ? 0 : 1, y: s.phone ? 80 : 0 },
					{
						opacity: s.phone ? 1 : 0,
						y: s.phone ? 0 : 80,
						duration: 1.1,
						ease: 'power3.out',
						immediateRender: false,
					},
					t,
				);
			}

			// The title card is gone by the beat that replaces it, so the next caption never lands on it.
			if (prev.title && !s.title) {
				tl.to(
					'#title',
					{
						opacity: 0,
						scale: 1.04,
						duration: 0.6,
						ease: 'power2.in',
					},
					t - 0.6,
				);
			}

			if (!prev.outro && s.outro) {
				tl.fromTo(
					'#outro',
					{ opacity: 0, scale: 0.96 },
					{
						opacity: 1,
						scale: 1,
						duration: 1.2,
						ease: 'power3.out',
						immediateRender: false,
					},
					t + 0.7,
				);
			}
		}

		mountPlayer({
			tl,
			END,
			snaps,
			cues: [...cues.values()],
			chapters,
			chapterTitle: (key) => options.chapters[key] ?? key,
			source: options.source,
			ready: frameReady.then((loaded) => {
				handle = loaded;
				renderAt(tl.time(), true);
			}),
			settle: async () => {
				await frameReady;
				await handle?.settle();
			},
			describeBeat: (prev, cur) => ({
				items: [
					prev.cap !== cur.cap && cur.cap ? 'Caption: ' + cur.cap.head : null,
					prev.view !== cur.view ? 'Screen: ' + cur.view : null,
					prev.status !== cur.status ? 'Session: ' + cur.status : null,
					prev.focus !== cur.focus && cur.focus ? 'Point at ' + cur.focus : null,
					prev.tap !== cur.tap && cur.tap ? 'Tap: ' + cur.tap : null,
					prev.confirm !== cur.confirm ? 'Confirmation ' + (cur.confirm ? 'open' : 'closed') : null,
					Boolean(prev.addGuest) !== Boolean(cur.addGuest)
						? 'Add guest ' + (cur.addGuest ? 'open' : 'closed')
						: null,
					prev.guests.length !== cur.guests.length ? 'Guests: ' + cur.guests.length : null,
					prev.checklist.length !== cur.checklist.length ? 'Ticked: ' + cur.checklist.length : null,
				].filter((item) => item !== null),
				minor:
					JSON.stringify([prev.addGuest, prev.broadcast]) !==
					JSON.stringify([cur.addGuest, cur.broadcast])
						? 'Typing'
						: null,
			}),
		});
	}

	return {
		A: __ADMIN_COPY__,
		market,
		clockAt,
		C,
		E,
		at,
		line,
		tap,
		go,
		before,
		confirm,
		type,
		openPhone,
		closePhone,
		finish,
	};
}

const adminGuide = { create };

export type AdminGuide = ReturnType<typeof create>;

declare global {
	interface Window {
		adminGuide: typeof adminGuide;
	}
}

window.adminGuide = adminGuide;
