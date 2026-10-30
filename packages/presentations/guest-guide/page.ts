/**
 * The guest market guide: a guest's phone from opening the market page to check-in, paced by the
 * narration. The phone is the guest app itself (`phone/`), in a frame of its own; this script
 * tells it what to show at each moment (`sceneAt`), and draws everything around it — captions,
 * the title and closing cards, and the room display. Waits for the stage, which the build inlines
 * after this script.
 */
import type { Locale } from '../../../src/locales.ts';
import type { PhoneHandle, PhoneScene } from '../phone/scene.ts';
import type { TimedLine } from '../stage/reel.ts';
import type { StageGuest } from '../stage/stage.ts';

declare const __NARRATION__: TimedLine[];
/** The guest phone's page, built from `phone/` by `build.ts`. */
declare const __FRAME__: string;

type Page =
	| 'language'
	| 'closed'
	| 'form'
	| 'submitting'
	| 'visit'
	| 'missed-window'
	| 'underway'
	| 'help';

type CaptionId =
	| 'open'
	| 'language'
	| 'closed'
	| 'window'
	| 'identity'
	| 'household'
	| 'returning'
	| 'join'
	| 'registered'
	| 'texts'
	| 'draw'
	| 'notSelected'
	| 'number'
	| 'line'
	| 'display'
	| 'called'
	| 'checkin'
	| 'late'
	| 'missed'
	| 'finished'
	| 'missedWindow'
	| 'underway'
	| 'help';

interface GuideGuest extends StageGuest {
	phone: string;
	/** When the desk called them, on the phone's clock (`HH:MM`). */
	calledAt: string | null;
}

interface GuideState {
	phase: 'title' | 'phone' | 'display';
	title: boolean;
	phone: boolean;
	kiosk: boolean;
	outro: boolean;
	page: Page;
	caption: CaptionId | null;
	/** What the narration points at, by mark (see `phone/marks.ts`). */
	focus: string | null;
	/** What a finger is on, by mark. */
	tap: string | null;
	/** A returning guest's phone, which skips the identity fields. */
	returning: boolean;
	/** The text-updates sheet is open. */
	consent: boolean;
	consentChecked: boolean;
	texts: boolean;
	registrationClosed: boolean;
	nowCalling: number | null;
	/** The guest whose phone this is, by number. */
	featured: number;
	/** The phone's clock, `HH:MM`. */
	time: string;
	form: { first: string; last: string; phone: string };
	guests: GuideGuest[];
}

/** The day the guide happens on, for the phone's clock. */
const MARKET_DAY = '2026-10-10';
const clockAt = (time: string) => new Date(`${MARKET_DAY}T${time}:00`).getTime();

document.addEventListener('DOMContentLoaded', () => {
	const {
		S,
		RTL,
		esc,
		k,
		one,
		beatScript,
		snapshotAt,
		narrationCues,
		put,
		phoneFrame,
		renderCaption,
		renderKiosk,
		mountPlayer,
	} = window.stage;
	const { cues, chapters, C, E } = narrationCues(__NARRATION__);
	let locale: Locale = 'en';
	const phone = phoneFrame('10:30');
	const app = one(phone, '.app');
	const frame = document.createElement('iframe');

	phone.id = 'guestPhone';
	// An illustration: the narration and captions carry what it shows, and a viewer's own taps
	// would take it off the script.
	frame.setAttribute('aria-hidden', 'true');
	frame.tabIndex = -1;
	frame.style.pointerEvents = 'none';
	frame.srcdoc = __FRAME__;
	app.appendChild(frame);
	k('phoneMotion').appendChild(phone);

	// A phone that never starts fails here, by name, rather than leaving capture and stills waiting.
	const phoneReady = new Promise<PhoneHandle>((resolve, reject) => {
		frame.addEventListener('load', () => {
			const handle = frame.contentWindow?.phone;

			if (handle) {
				void handle.ready.then(() => resolve(handle));
			} else {
				reject(new Error('The guest phone did not start; its frame logged why.'));
			}
		});
	});

	phoneReady.catch((error: unknown) => console.error(error));

	// A small fictional line. Maya receives ticket 4 only after selection.
	const initial: GuideState = {
		phase: 'title',
		title: true,
		phone: false,
		kiosk: false,
		outro: false,
		page: 'language',
		caption: null,
		focus: null,
		tap: null,
		returning: false,
		consent: false,
		consentChecked: false,
		texts: false,
		registrationClosed: false,
		nowCalling: null,
		featured: 4,
		time: '10:30',
		form: { first: '', last: '', phone: '' },
		guests: [
			['Luis', 'Herrera', '(510) 555-0118'],
			['Mai', 'Nguyen', '(510) 555-0127'],
			['Grace', 'Okafor', '(510) 555-0135'],
			['Maya', 'Rivera', '(510) 555-0142'],
			['Amal', 'Haddad', '(510) 555-0163'],
		].map(([first = '', last = '', phone = ''], i) => ({
			n: i + 1,
			first,
			last,
			phone,
			loc: 'en',
			status: 'registered',
			warmth: 0,
			calledAt: null,
		})),
	};
	const { at, snapshots } = beatScript(initial);
	const g = (s: GuideState, n: number) => s.guests[n - 1]!;
	const call = (s: GuideState, n: number) => {
		g(s, n).status = 'called';
		g(s, n).calledAt = s.time;
	};
	const scene = (id: CaptionId, page: Page, caption: CaptionId, focus: string | null = null) =>
		at(C(id), (s) => {
			s.page = page;
			s.caption = caption;
			s.focus = focus;
		});
	const tap = (t: number, target: string, action?: (s: GuideState) => void) => {
		at(t, (s) => {
			s.tap = target;
		});
		at(t + 0.4, (s) => {
			s.tap = null;
			action?.(s);
		});
	};
	const type = (id: string, key: keyof GuideState['form'], value: string, fraction: number) => {
		for (let i = 1; i <= value.length; i++) {
			at(C(id, fraction) + i * 0.07, (s) => {
				s.form[key] = value.slice(0, i);
			});
		}
	};

	at(C('open'), (s) => {
		s.title = false;
		s.phone = true;
		s.phase = 'phone';
		s.caption = 'open';
	});
	scene('language', 'language', 'language', 'languages');
	tap(C('language', 0.6), 'language-en', (s) => {
		s.page = 'closed';
	});
	scene('closed', 'closed', 'closed');
	scene('window', 'form', 'window', 'timer');
	scene('identity', 'form', 'identity', 'identity');
	type('identity', 'first', 'Maya', 0.05);
	type('identity', 'last', 'Rivera', 0.28);
	type('identity', 'phone', '(510) 555-0142', 0.5);
	scene('household', 'form', 'household', 'household');
	scene('returning', 'form', 'returning', 'identity-card');
	at(C('returning'), (s) => {
		s.featured = 1;
		s.returning = true;
	});
	scene('join', 'form', 'join', 'join');
	at(C('join'), (s) => {
		s.featured = 4;
		s.returning = false;
	});
	tap(C('join', 0.65), 'join', (s) => {
		s.page = 'submitting';
		s.focus = null;
	});
	scene('registered', 'visit', 'registered');
	scene('texts', 'visit', 'texts', 'texts');
	tap(C('texts', 0.28), 'texts', (s) => {
		s.consent = true;
		s.focus = null;
	});
	at(C('texts', 0.67), (s) => {
		s.consentChecked = true;
		s.focus = 'enable';
	});
	tap(C('texts', 0.86), 'enable', (s) => {
		s.consent = false;
		s.texts = true;
		s.focus = null;
	});
	scene('draw', 'visit', 'draw');
	at(C('draw'), (s) => {
		s.registrationClosed = true;
		s.time = '10:45';
	});
	scene('notSelected', 'visit', 'notSelected');
	at(C('notSelected'), (s) => {
		s.featured = 5;
		g(s, 5).status = 'not_placed';
	});
	scene('number', 'visit', 'number', 'number');
	at(C('number'), (s) => {
		s.featured = 4;
		s.guests.slice(0, 4).forEach((x) => {
			x.status = 'waiting';
		});
	});
	scene('line', 'visit', 'line', 'nowcalling');
	at(C('line', 0.4), (s) => {
		s.time = '11:30';
		call(s, 1);
		s.nowCalling = 1;
	});
	at(C('line', 0.7), (s) => {
		g(s, 1).status = 'served';
		call(s, 2);
		s.nowCalling = 2;
	});
	scene('display', 'visit', 'display', 'nowcalling');
	at(C('display'), (s) => {
		s.kiosk = true;
		s.phase = 'display';
	});
	scene('called', 'visit', 'called', 'number');
	at(C('called', 0.5), (s) => {
		g(s, 2).status = 'served';
		call(s, 3);
		call(s, 4);
		s.nowCalling = 4;
	});
	scene('checkin', 'visit', 'checkin', 'number');
	at(C('checkin'), (s) => {
		s.kiosk = false;
		s.phase = 'phone';
	});
	scene('late', 'visit', 'late', 'number');

	// Ten minutes pass in a few seconds; the phone's board warms as LateArrival says it does.
	for (let minute = 3; minute <= 10; minute++) {
		at(C('late', (minute - 3) / 10), (s) => {
			s.time = '11:' + (30 + minute);
		});
	}
	scene('missed', 'visit', 'missed');
	at(C('missed'), (s) => {
		g(s, 4).status = 'no_show';
	});
	scene('finished', 'visit', 'finished');
	at(C('finished'), (s) => {
		g(s, 4).status = 'served';
	});
	scene('missedWindow', 'missed-window', 'missedWindow');
	scene('underway', 'underway', 'underway');
	scene('help', 'help', 'help', 'help');
	at(E('help'), (s) => {
		s.phone = false;
		s.outro = true;
		s.caption = null;
	});
	const END = E('help', 4);
	const snaps = snapshots();

	/* ================= the phone ================= */

	/** When each snapshot's clock was last set, so the phone's clock runs on from there. */
	const clockSetAt = snaps.reduce<number[]>((list, snap, i) => {
		const prev = snaps[i - 1];

		list.push(prev && prev.s.time === snap.s.time ? list[i - 1]! : snap.t);

		return list;
	}, []);
	/** Fourteen minutes left to register when the narration turns to the timer. */
	const registrationClosesAt = clockAt('10:30') + Math.floor(C('window')) * 1000 + 14 * 60_000;

	/** The market as the phone's server reports it on each page. */
	function marketOf(s: GuideState): PhoneScene['market'] {
		switch (s.page) {
			case 'language':
			case 'closed':
				return { status: 'inactive' };
			case 'form':
			case 'submitting':
				return { status: 'registration_open', registrationClosesAt };
			case 'visit':
				return {
					status: s.registrationClosed ? 'service_started' : 'registration_open',
					registrationClosesAt,
				};
			case 'missed-window':
				return { status: 'registration_closed', registrationClosesAt };
			case 'underway':
			case 'help':
				return { status: 'service_started', registrationClosesAt };
		}
	}

	/** The featured guest's visit, as the phone's server reports it. */
	function visitOf(s: GuideState): PhoneScene['visit'] {
		if (s.page !== 'visit') {
			return null;
		}

		const x = g(s, s.featured);
		const inLine = x.status === 'waiting' || x.status === 'called';
		const called = s.guests
			.filter((y) => y.status === 'called')
			.sort((a, b) => b.n - a.n)
			.map((y) => y.n);

		return {
			status: x.status as NonNullable<PhoneScene['visit']>['status'],
			queuePosition: inLine ? x.n : null,
			aheadOfYou:
				x.status === 'waiting'
					? s.guests.filter((y) => y.status === 'waiting' && y.n < x.n).length
					: null,
			calledAt: x.calledAt === null ? null : clockAt(x.calledAt),
			nowCalling: s.nowCalling,
			called,
		};
	}

	/** What the phone shows at `time`, in snapshot `i`. */
	function sceneAt(i: number, time: number): PhoneScene {
		const s = snaps[i]!.s;
		const x = g(s, s.featured);
		const remembered =
			s.page === 'form' ? s.returning : !['language', 'closed', 'submitting'].includes(s.page);
		const defaultScroll = s.page === 'submitting' ? 'join' : s.page === 'visit' ? 'standing' : null;

		return {
			now: clockAt(s.time) + Math.max(0, Math.floor(time - clockSetAt[i]!)) * 1000,
			locale,
			route: s.page === 'help' ? 'help' : 'home',
			returning: s.page !== 'language',
			identity: remembered ? { firstName: x.first, lastName: x.last, phone: x.phone } : null,
			// Maya's household, as she fills it in; the narration only points at it.
			form: {
				firstName: s.form.first,
				lastName: s.form.last,
				phone: s.form.phone,
				ageRange: '30-44',
				householdSize: 3,
				childrenCount: 1,
				seniorsCount: 0,
			},
			submitting: s.page === 'submitting',
			market: marketOf(s),
			visit: visitOf(s),
			texts: {
				consented: s.texts,
				sheet: s.consent ? (s.consentChecked ? 'checked' : 'open') : 'closed',
			},
			focus: s.focus,
			tap: s.tap === 'language-en' ? 'language-' + locale : s.tap,
			scrollTo: s.focus ?? defaultScroll,
		};
	}

	let handle: PhoneHandle | null = null;
	let shownScene = '';
	let lastTime = 0;

	/** Hands the phone the scene at `time`; anything but forward play starts it over. */
	function showPhone(i: number, time: number, jumped: boolean) {
		const scene = sceneAt(i, time);
		const json = JSON.stringify(scene);
		const continuous = !jumped && time >= lastTime && time - lastTime < 0.5;

		lastTime = time;

		if (handle && (json !== shownScene || !continuous)) {
			shownScene = json;
			handle.show(scene, continuous);
		}
	}

	/** The phone's frame calls attention to a call, and its screen eases in when it changes. */
	let screenKey = '';

	function frameFor(s: GuideState) {
		const x = g(s, s.featured);
		const key = s.page === 'visit' ? x.status : s.page;

		if (screenKey && key !== screenKey) {
			app.classList.remove('swap');
			void app.offsetWidth;
			app.classList.add('swap');
		}

		if (key === 'called' && screenKey !== 'called') {
			phone.classList.remove('is-called');
			void phone.offsetWidth;
			phone.classList.add('is-called');
		}

		if (key !== 'called') {
			phone.classList.remove('is-called');
		}
		screenKey = key;
		one(phone, '.statusbar > span').textContent = s.time;
	}

	/* ================= captions ================= */

	// Captions reuse the app's short labels and localized guidance, never separate guest copy.
	function captionOf(id: CaptionId) {
		const L = S[locale],
			G = L.guide,
			H = G.help,
			T = G.tour.steps,
			V = G.visitStatus;
		const first = H.steps[0]!,
			second = H.steps[1]!,
			fourth = H.steps[3]!;
		const captions: Record<CaptionId, [string | undefined, string, string]> = {
			open: [first.time, first.title, first.body],
			language: [H.title, second.title, G.languageHint],
			closed: [H.stepsHeading, G.notOpenState.heading, G.notOpenState.subheading],
			window: [T.countdown.time, T.countdown.title, first.body],
			identity: [H.stepsHeading, G.forms.informationLegend, G.formDescription],
			household: [
				H.stepsHeading,
				G.forms.lotteryLegend,
				G.household + '. ' + G.householdHint + '.',
			],
			returning: [H.stepsHeading, G.identityIndicator.heading, G.formDescription],
			join: [H.stepsHeading, L.joinLottery, G.formDescription],
			registered: [H.stepsHeading, V.registered.header, V.registered.details],
			texts: [H.title, T.textUpdates.title, fourth.body],
			draw: [T.lottery.time, T.lottery.title, T.lottery.body],
			notSelected: [T.lottery.time, V.not_placed.header, G.scheduleInformation.heading],
			number: [T.lottery.time, V.waiting.header, H.phoneNotice.heading],
			line: [H.title, T.line.title, G.refreshNotice.accessibleDescription],
			display: [T.turn.time, V.waiting.nowCallingLabel, V.waiting.details],
			called: [T.turn.time, V.called.header, V.called.details],
			checkin: [V.called.header, H.phoneNotice.heading, H.phoneNotice.body],
			late: [V.called.header, V.yourNumberLabel, V.called.detailsLate],
			missed: [H.title, V.no_show.header, V.no_show.details],
			finished: [H.title, V.served.header, V.served.details],
			missedWindow: [
				H.stepsHeading,
				G.registrationClosedState.heading,
				G.scheduleInformation.heading,
			],
			underway: [
				H.stepsHeading,
				// The app shows a guest without a visit the registration-closed card once shopping begins.
				G.registrationClosedState.headline,
				G.registrationClosedState.description,
			],
			help: [H.title, T.help.title, T.help.body.replace('{help}', H.title)],
		};
		const [eyebrow, head, sub] = captions[id];

		return { eyebrow: String(eyebrow), head, sub };
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
				['kioskLocation', s.kiosk],
				['title', s.title],
				['outro', s.outro],
			] as const) {
				k(id).setAttribute('aria-hidden', String(!visible));
			}
			renderCaption({ cap: s.caption ? captionOf(s.caption) : null });
			const G = S[locale].guide;
			const dir = RTL.has(locale) ? 'rtl' : 'ltr';

			for (const [id, heading, sub] of [
				['title', G.presentation.heading, G.help.introBody],
				['outro', G.tour.steps.help.title, G.tour.steps.help.body.replace('{help}', G.help.title)],
			] as const) {
				const card = k(id);

				card.setAttribute('dir', dir);
				put(one(card, '.line'), esc(heading));
				put(one(card, '.sub'), esc(sub));
			}
			k('cap').setAttribute('dir', dir);
			frameFor(s);
		}
		showPhone(i, time, force);
		renderKiosk(s, Math.max(0, Math.floor((time - C('display')) / 3.4)));
	}

	/* ================= timeline ================= */

	const tl = gsap.timeline({
		id: 'Guest Market Guide',
		paused: true,
		onUpdate: () => renderAt(tl.time()),
	});

	gsap.set('#phoneMotion, #kiosk', { opacity: 0 });
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

		for (const [key, el] of [
			['phone', '#phoneMotion'],
			['kiosk', '#kiosk'],
		] as const) {
			if (prev[key] !== s[key]) {
				tl.fromTo(
					el,
					{ opacity: s[key] ? 0 : 1, y: s[key] ? 80 : 0 },
					{
						opacity: s[key] ? 1 : 0,
						y: s[key] ? 0 : 80,
						duration: 1.1,
						ease: 'power3.out',
						immediateRender: false,
					},
					t,
				);
			}
		}

		if (prev.title && !s.title) {
			tl.to('#title', { opacity: 0, scale: 1.04, duration: 0.6, ease: 'power2.in' }, t);
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

	type Guide = (typeof S)[Locale]['guide'];

	mountPlayer({
		tl,
		END,
		snaps,
		cues: [...cues.values()],
		chapters,
		chapterTitle: (key, value) =>
			S[value].guide.presentation.chapters[key as keyof Guide['presentation']['chapters']],
		source: 'guest-guide/page.ts',
		onLocaleChange: (value) => {
			locale = value;
			renderAt(tl.time(), true);
		},
		ready: phoneReady.then((loaded) => {
			handle = loaded;
			renderAt(tl.time(), true);
		}),
		settle: async () => {
			await phoneReady;
			await handle?.settle();
		},
		describeBeat: (prev, cur) => ({
			items: [
				prev.caption !== cur.caption && cur.caption ? 'Caption: ' + cur.caption : null,
				prev.page !== cur.page ? 'Screen: ' + cur.page : null,
				prev.focus !== cur.focus && cur.focus ? 'Point at ' + cur.focus : null,
				g(prev, 4).status !== g(cur, 4).status ? 'Visit: ' + g(cur, 4).status : null,
				prev.kiosk !== cur.kiosk ? 'Room display ' + (cur.kiosk ? 'in' : 'out') : null,
				prev.tap !== cur.tap && cur.tap ? 'Tap: ' + cur.tap : null,
			].filter((item) => item !== null),
			minor: JSON.stringify(prev.form) !== JSON.stringify(cur.form) ? 'Typing' : null,
		}),
	});
});
