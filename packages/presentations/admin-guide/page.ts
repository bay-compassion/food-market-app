/**
 * The admin guide: the market dashboard through one market day, from the schedule to closing the
 * session, paced by the narration. The dashboard is the app's own (`admin/`), in a frame of its
 * own on the stage's phone; this script tells it what to show at each moment (`sceneAt`), and draws
 * everything around it — captions and the title and closing cards. Waits for the stage, which the
 * build inlines after this script.
 *
 * Every moment is a scene the frame can build from nothing, so the video re-renders against
 * whatever the dashboard looks like today: change a screen, rebuild, and the guide shows the new
 * one. What the narration points at is named by the dashboard's own copy (`AdminMark`), and
 * `verify.ts` fails when the screen stops showing one.
 */
import type { AdminTranslation } from '../../../src/adminLocales.ts';
import type { Locale } from '../../../src/locales.ts';
import type { AdminView } from '../../../src/services/admin-views.ts';
import type { SessionStatus } from '../../../src/services/sessionStateMachine.ts';
import type {
	AdminHandle,
	AdminMark,
	AdminScene,
	AdminSceneGuest,
	AdminSceneGuestForm,
} from '../admin/scene.ts';
import type { TimedLine } from '../stage/reel.ts';
import type { Caption } from '../stage/stage.ts';

declare const __NARRATION__: TimedLine[];
/** The admin frame's page, built from `admin/` by `build.ts`. */
declare const __FRAME__: string;
/** The dashboard's English copy, from `src/adminLocales.ts`, so captions name what it names. */
declare const __ADMIN_COPY__: AdminTranslation;

interface GuideState {
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
	/** Whether the view switcher's sheet of screens is open. */
	navigating: boolean;
	focus: AdminMark | null;
	tap: AdminMark | null;
	scrollTo: AdminMark | null;
}

/** The Saturday the guide happens on, for the frame's clock. */
const MARKET_DAY = '2026-10-31';
const clockAt = (time: string) =>
	new Date(`${MARKET_DAY}T${time.length === 5 ? time + ':00' : time}`).getTime();

document.addEventListener('DOMContentLoaded', () => {
	const { k, one, beatScript, snapshotAt, narrationCues, phoneFrame, renderCaption, mountPlayer } =
		window.stage;
	const A = __ADMIN_COPY__;
	const { cues, chapters, C, E } = narrationCues(__NARRATION__);
	/** Chapter titles, by the `chapter` key on the narration line each one starts at. */
	const CHAPTERS: Record<string, string> = {
		intro: 'Introduction',
		schedule: 'The Schedule',
		scheduled: 'Before Registration',
		registration: 'Registration',
		lottery: 'The Lottery',
		service: 'Service',
		addGuest: 'Adding a Guest',
		broadcast: 'Broadcasts',
		records: 'Records and Reports',
		closing: 'Closing the Session',
	};

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

	const initial: GuideState = {
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
		navigating: false,
		focus: null,
		tap: null,
		scrollTo: null,
	};
	const { at, snapshots } = beatScript(initial);
	const guest = (s: GuideState, n: number) => s.guests.find((x) => x.n === n)!;
	const register = (s: GuideState, n: number) => {
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
	};
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
	const tap = (t: number, target: AdminMark, action?: (s: GuideState) => void) => {
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
	 * Moves to another screen as a worker does on a phone: a tap on the title opens the sheet of
	 * screens, a tap on one opens it, and the new screen starts at its top.
	 */
	const go = (t: number, view: AdminView, action?: (s: GuideState) => void) => {
		at(t, (s) => {
			s.tap = 'switcher';
			s.focus = null;
		});
		at(t + 0.25, (s) => {
			s.tap = null;
			s.navigating = true;
		});
		at(t + 0.4, (s) => {
			s.tap = `tab:${view}`;
		});
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
	const confirm = (
		t: number,
		ask: AdminMark,
		agree: AdminMark,
		then: (s: GuideState) => void,
		gap = 1.6,
	) => {
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
		write: (s: GuideState, text: string) => void,
		pace = 0.06,
	) => {
		for (let i = 1; i <= value.length; i++) {
			at(start + i * pace, (s) => write(s, value.slice(0, i)));
		}
	};

	/* ================= the beat script ================= */

	at(C('tabs'), (s) => {
		s.title = false;
		s.phone = true;
		s.phase = 'phone';
		s.time = '10:12';
	});
	line(
		'tabs',
		['Getting started', 'Sign in on your phone.', 'Tap the title to switch screens.'],
		'switcher',
		null,
	);
	// The title opens the sheet of every screen, which stays up into the first move.
	at(C('tabs', 0.45), (s) => {
		s.navigating = true;
		s.focus = 'navigation';
	});

	// The schedule.
	tap(before('schedule'), 'tab:schedule', (s) => {
		s.navigating = false;
		s.view = 'schedule';
		s.scrollTo = null;
	});
	line('schedule', [A.schedule, A.schedulePatternDialogTitle, A.scheduleIntro], 'row:0');
	line('upcoming', [A.schedule, A.scheduleGridLabel, A.scheduleIntro], 'row:1');
	line(
		'oneOff',
		[A.schedule, A.scheduleAddOneOff, A.scheduleOneOffDialogTitle],
		'button:scheduleAddOneOff',
	);

	// Before registration.
	go(before('current'), 'current-session');
	line('current', [A.currentSession, 'Where today stands.', A.scheduled], 'status');
	line('scheduled', [A.scheduled, A.openRegistrationNow, A.postponeByMinutes], 'step');

	// Registration.
	at(C('open'), (s) => {
		s.status = 'registration_open';
		s.time = '10:30';
	});
	line(
		'open',
		[A.open, 'Guests sign up from their phones.', A.registrationOpenUntil + ' 10:45 AM'],
		'status',
	);
	PEOPLE.forEach((_, i) => {
		const t = i < 4 ? C('open', 0.35 + i * 0.15) : C('registered', ((i - 4) / PEOPLE.length) * 1.4);

		// One every forty seconds or so, all inside the fifteen-minute window.
		const seconds = 30 + i * 40;

		at(t, (s) => {
			register(s, i + 1);
			s.time = `10:${String(30 + Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
		});
	});
	line(
		'registered',
		[A.open, A.registered, `${A.householdCount}, language and phone.`],
		'heading:registered',
	);
	line(
		'overrides',
		[A.registrationOverrides, A.extendRegistration, A.overridesHelp],
		'field:extendRegistrationMinutes',
	);
	at(C('overrides', 0.55), (s) => {
		s.focus = 'field:capacity';
		s.scrollTo = 'field:capacity';
	});
	line(
		'closeEarly',
		[A.open, A.closeRegistration, A.confirmCloseRegistration],
		'button:closeRegistration',
	);
	confirm(C('closeEarly', 0.6), 'button:closeRegistration', 'sheet:confirmContinue', (s) => {
		s.status = 'registration_closed';
		s.time = '10:44:50';
		s.closesAt = '10:44:50';
	});

	// The lottery: a grace period, then the draw.
	line('grace', [A.closed, A.lotteryPending, A.registrationClosedHelp], 'timer');
	at(E('grace', -0.8), (s) => {
		s.status = 'lottery_pending';
		s.time = '10:45:20';
	});
	line(
		'pending',
		[A.lotteryActions, A.runLotteryNow, A.lotteryDrawsAt.replace('{time}', '10:50 AM')],
		'heading:lotteryActions',
	);
	at(C('pending', 0.45), (s) => {
		s.focus = 'button:pauseLottery';
	});
	line('draw', [A.lotteryActions, A.runLotteryNow, A.confirmRunLottery], 'button:runLotteryNow');
	confirm(C('draw', 0.15), 'button:runLotteryNow', 'sheet:confirmContinue', (s) => {
		s.status = 'service_started';
		s.time = '10:47';
		DRAWN.forEach((n, i) => {
			guest(s, n).status = 'waiting';
			guest(s, n).queuePosition = i + 1;
		});
		s.guests.filter((x) => x.status === 'registered').forEach((x) => (x.status = 'not_placed'));
	});

	// Service.
	at(C('overview'), (s) => {
		s.time = '11:52';
		DRAWN.slice(0, 5).forEach((n) => (guest(s, n).status = 'served'));
		guest(s, DRAWN[5]!).status = 'no_show';
		DRAWN.slice(6, 8).forEach((n) => {
			guest(s, n).status = 'called';
			guest(s, n).calledAt = clockAt('11:49');
		});
	});
	line(
		'overview',
		[A.serviceStarted, A.overview, A.placedToday.replace('{count}', String(CAPACITY))],
		'overview',
	);
	line(
		'queue',
		[A.serviceStarted, A.goToQueue, 'Calling guests is in the queue desk guide.'],
		'button:goToQueue',
	);
	tap(C('queue', 0.3), 'button:goToQueue', (s) => {
		s.view = 'queue';
		s.scrollTo = null;
	});

	// Adding a guest by hand.
	line(
		'addGuest',
		[A.queue, A.manualGuestTitle, 'The same details the guest form asks for.'],
		'button:addGuest',
	);
	tap(C('addGuest', 0.45), 'button:addGuest', (s) => {
		s.focus = null;
		s.scrollTo = null;
		s.addGuest = {
			firstName: '',
			lastName: '',
			phone: '',
			ageRange: '',
			householdSize: '',
			childrenCount: '',
			seniorsCount: '',
		};
	});
	type(C('addGuest', 0.55), WALK_IN.first, (s, v) => (s.addGuest!.firstName = v));
	type(C('addGuest', 0.7), WALK_IN.last, (s, v) => (s.addGuest!.lastName = v));
	at(C('admission'), (s) => {
		s.addGuest = {
			...s.addGuest!,
			phone: WALK_IN.phone,
			ageRange: '30-44',
			householdSize: WALK_IN.household,
			childrenCount: 1,
			seniorsCount: 0,
		};
	});
	line(
		'admission',
		[A.admissionLegend, A.admitToQueue, A.admitToQueueHelp],
		'field:admissionLabel',
	);
	line('saveGuest', [A.admissionLegend, A.saveGuest, A.placeEnd], 'button:saveGuest');
	tap(C('saveGuest', 0.45), 'button:saveGuest', (s) => {
		s.addGuest = null;
		s.guests.push({ ...WALK_IN });
		s.focus = null;
		s.scrollTo = null;
	});

	// Broadcasts.
	go(before('broadcast'), 'broadcast');
	line(
		'broadcast',
		[A.broadcastTitle, 'Reach every guest at once.', A.broadcastHelp],
		'heading:broadcastTitle',
		null,
	);
	at(C('message'), (s) => {
		s.focus = 'field:broadcastTitleLabel';
	});
	type(C('message', 0.02), 'Service is running late', (s, v) => (s.broadcast.title = v), 0.04);
	type(
		C('message', 0.3),
		'We start again in ten minutes. Please wait for your number.',
		(s, v) => {
			s.broadcast.body = v;
			s.focus = 'field:broadcastMessageLabel';
		},
		0.025,
	);
	at(C('message'), (s) => {
		s.cap = { eyebrow: A.broadcastTitle, head: A.broadcastSend, sub: A.broadcastHelp };
	});
	confirm(
		E('message', -1.6),
		'button:broadcastSend',
		'sheet:broadcastSend',
		(s) => {
			s.broadcast = { title: '', body: '' };
		},
		1.2,
	);

	// Records and reports.
	go(before('database'), 'guest-database');
	line(
		'database',
		[A.guestDatabase, 'Everyone on record.', 'Search by name or phone number.'],
		'search',
	);
	go(before('history'), 'session-history');
	line('history', [A.historySessions, 'Past markets, by month.', A.recordServedGuest], 'history');
	go(before('reports'), 'reports');
	line('reports', [A.reports, A.reportNames['session-summary'], A.reportPrivacyNote], 'report');

	// Closing the session.
	go(before('close'), 'queue', (s) => {
		s.time = '13:05';
		// Everyone placed has come up by the time the market closes.
		s.guests
			.filter((x) => x.status === 'called' || x.status === 'waiting')
			.forEach((x) => (x.status = 'served'));
	});
	line('close', [A.queue, A.closeSession, A.confirmCloseSession], 'button:closeSession');
	confirm(C('close', 0.5), 'button:closeSession', 'sheet:confirmContinue', (s) => {
		s.status = 'ended';
		s.archived = true;
	});
	go(before('next'), 'current-session');
	line('next', [A.currentSession, 'Ready for next week.', A.scheduleIntro], 'step');
	at(C('thanks'), (s) => {
		s.cap = null;
		s.focus = null;
	});
	at(E('thanks'), (s) => {
		s.phone = false;
		s.outro = true;
		s.phase = 'outro';
	});
	const END = E('thanks', 4);
	const snaps = snapshots();

	/* ================= the dashboard ================= */

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

	/* ================= rendering ================= */

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
				.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
				.replace(/\s?[AP]M$/, '');
		}
		showFrame(i, time, force);
	}

	/* ================= timeline ================= */

	const tl = gsap.timeline({
		id: 'Market Dashboard Guide',
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
		{ opacity: 1, y: 0, duration: 0.9, stagger: 0.25, ease: 'power3.out' },
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
			tl.to('#title', { opacity: 0, scale: 1.04, duration: 0.6, ease: 'power2.in' }, t - 0.6);
		}

		if (!prev.outro && s.outro) {
			tl.fromTo(
				'#outro',
				{ opacity: 0, scale: 0.96 },
				{ opacity: 1, scale: 1, duration: 1.2, ease: 'power3.out', immediateRender: false },
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
		chapterTitle: (key) => CHAPTERS[key] ?? key,
		source: 'admin-guide/page.ts',
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
			].filter((item) => item !== null),
			minor:
				JSON.stringify([prev.addGuest, prev.broadcast]) !==
				JSON.stringify([cur.addGuest, cur.broadcast])
					? 'Typing'
					: null,
		}),
	});
});
