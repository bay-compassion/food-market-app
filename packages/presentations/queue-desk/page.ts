/**
 * The queue desk training video: a closer recreation of `/queue`, paced by the narration. Waits for
 * the stage, which the build inlines after this script.
 */
import type { Locale } from '../../../src/locales.ts';
import type { TimedLine } from '../stage/reel.ts';
import type { Caption, StageGuest } from '../stage/stage.ts';

declare const __NARRATION__: TimedLine[];

type Field = 'first' | 'last' | 'phone';

/** One line of a ticket's history: its kind, title, byline and time. */
type HistoryEntry = [string, string, string, string];

interface DeskGuest extends StageGuest {
	label: string;
	household: number;
	place: 'hidden' | 'shown';
	/** Put at the front of the line by hand. */
	front: boolean;
	order: number;
	/** When the desk called them, on the timeline. */
	calledT: number | null;
	/** Seconds they were called before `calledT`, as if more time had passed. */
	lag: number;
	minutes: number;
	history: HistoryEntry[];
}

interface DeskState {
	phase: 'title' | 'desk' | 'outro';
	title: boolean;
	outro: boolean;
	desk: boolean;
	kiosk: boolean;
	guestPhone: boolean;
	deskPhase: 'not_started' | 'serving' | 'ended';
	guests: DeskGuest[];
	nowCalling: number | null;
	/** The guest whose phone shows, by number. */
	featured: number;
	/** Which screens are lit; the rest dim. */
	lit: ('kiosk' | 'guest')[];
	sheet: number | null;
	sheetTo: string | null;
	scrollTo: string | null;
	tap: string | null;
	spot: string | null;
	menu: 'kebab' | 'return' | null;
	dialog: 'add' | 'qr' | null;
	form: Record<Field, string> & { focus: Field | null; placement: 'end' | 'next' };
	banner: boolean;
	toast: string | null;
	confirm: boolean;
	callout: boolean;
	printOnline: boolean;
	cap: Caption | null;
}

document.addEventListener('DOMContentLoaded', () => {
	const { DESK: T, ENGLISH, esc, k, label, beatScript, snapshotAt, cap, put } = window.stage;
	const { statusHtml, guestApp, phoneFrame, renderGuestPhone, renderKiosk, renderCaption } =
		window.stage;

	/* ================= narration ================= */

	// Each line starts its `pause` after the one before it ends; `duration` is its recording's
	// length, measured by voice.ts. Beats hang off the lines, so a reworded line retimes them.
	const NARRATION = __NARRATION__;
	const { cues: CUES, chapters: CHAPTER_CUES, C, E } = window.stage.narrationCues(NARRATION);
	/** Chapter titles, by the `chapter` key on the narration line each one starts at. */
	const CHAPTERS: Record<string, string> = {
		intro: 'Introduction',
		beforeService: 'Before service',
		line: 'A tour of the line',
		calling: 'Calling a guest',
		nameTag: 'The name tag',
		serve: 'Serve and call next',
		late: 'Late arrivals',
		noShows: 'No-shows',
		addGuest: 'Adding a guest by hand',
		reaching: 'Reaching a guest',
		ending: 'Ending the day',
	};

	/* ================= the line ================= */

	// Fictional guests. Numbers 1–14 were drawn; two registrants were not; Rosa is added by hand.
	const PEOPLE: [string, string, Locale, number][] = [
		['Luis', 'Herrera', 'es', 3],
		['Mai', 'Nguyen', 'vi', 2],
		['Wei', 'Chen', 'zh', 4],
		['Grace', 'Okafor', 'en', 1],
		['Amal', 'Haddad', 'ar', 5],
		['Josefina', 'Reyes', 'tl', 2],
		['Claire', 'Dubois', 'fr', 3],
		['Reza', 'Karimi', 'fa', 2],
		['Ana', 'Morales', 'es', 4],
		['Daniel', 'Brooks', 'en', 1],
		['Linh', 'Tran', 'vi', 3],
		['Carmen', 'Ruiz', 'es', 2],
		['Hassan', 'Nouri', 'fa', 5],
		['Mei', 'Lin', 'zh', 2],
		['Samuel', 'Ortega', 'es', 3],
		['Huong', 'Vo', 'vi', 2],
		['Rosa', 'Mendoza', 'es', 3],
	];
	const DRAWN = 14;
	const WALK_IN = 17;
	const TYPED = { first: 'Rosa', last: 'Mendoza', phone: '(510) 555-0187' };

	const initial: DeskState = {
		phase: 'title',
		title: true,
		outro: false,
		desk: false,
		kiosk: false,
		guestPhone: false,
		deskPhase: 'not_started',
		guests: PEOPLE.map(([first, last, loc, household], i) => ({
			n: i + 1,
			label: i < DRAWN ? String(i + 1) : i + 1 === WALK_IN ? 'P1' : '—',
			first,
			last,
			loc,
			household,
			status: i < DRAWN ? 'waiting' : i + 1 === WALK_IN ? 'waiting' : 'not_placed',
			place: i + 1 === WALK_IN ? 'hidden' : 'shown',
			front: false,
			order: i + 1,
			calledT: null,
			lag: 0,
			minutes: 0,
			warmth: 0,
			history: i < DRAWN ? [['drawn', T.historyKinds.drawn, 'Lottery draw', '10:45 AM']] : [],
		})),
		nowCalling: null,
		featured: 1,
		lit: [],
		sheet: null,
		sheetTo: null,
		scrollTo: null,
		tap: null,
		spot: null,
		menu: null,
		dialog: null,
		form: { first: '', last: '', phone: '', focus: null, placement: 'end' },
		banner: false,
		toast: null,
		confirm: false,
		callout: false,
		printOnline: true,
		cap: null,
	};
	const { at, snapshots } = beatScript(initial);
	const g = (s: DeskState, n: number) => s.guests[n - 1]!;
	/** Calls a guest at time `t`; `lag` pretends they were called that many seconds earlier. */
	const call = (s: DeskState, n: number, t: number, lag = 0) => {
		Object.assign(g(s, n), { status: 'called', calledT: t, lag, minutes: Math.floor(lag / 60) });
		g(s, n).history.push(['called', T.historyKinds.called, 'By Jordan', '11:32 AM']);
		s.nowCalling = n;
	};
	const serve = (s: DeskState, n: number) => {
		g(s, n).status = 'served';
		g(s, n).history.push(['served', T.historyKinds.served, 'By Jordan', '11:34 AM']);
	};
	/** Moves the clock on for every called guest, as if `minutes` had passed. */
	const later = (s: DeskState, minutes: number) => {
		for (const x of s.guests) {
			if (x.status !== 'called') {
				continue;
			}
			x.lag += minutes * 60;
			x.minutes += minutes;
			// LateArrival: three minutes' grace, then a squared ease to full yellow at ten.
			x.warmth = Math.min(1, Math.max(0, (x.minutes - 3) / 7)) ** 2;
		}
	};
	/** A tap: the finger lands at `t`, and `then` happens just after it lifts. */
	// These schedule beats on their caller's behalf, so #dev lists the caller's line (`via: 1`).
	const tap = (t: number, key: string, then?: (s: DeskState) => void) => {
		at(
			t,
			(s) => {
				s.tap = key;
			},
			{ via: 1 },
		);
		at(
			t + 0.4,
			(s) => {
				s.tap = null;
				then?.(s);
			},
			{ via: 1 },
		);
	};
	const spot = (t: number, key: string) =>
		at(
			t,
			(s) => {
				s.spot = key;
			},
			{ via: 1 },
		);
	const type = (t: number, field: Field, text: string) => {
		at(
			t,
			(s) => {
				s.form.focus = field;
			},
			{ via: 1 },
		);

		for (let i = 1; i <= text.length; i++) {
			at(
				t + i * 0.06,
				(s) => {
					s.form[field] = text.slice(0, i);
				},
				{ via: 1 },
			);
		}

		return t + text.length * 0.06 + 0.2;
	};

	/* ================= beat script ================= */

	// Title.
	at(E('welcome', 0.3), (s) => {
		s.title = false;
	});

	// Before service.
	at(C('open'), (s) => {
		s.phase = 'desk';
		s.desk = true;
		cap(
			'Before service',
			'Open the queue screen on your phone.',
			'Sign in with your volunteer account.',
		)(s);
	});
	at(C('before'), (s) => {
		s.spot = 'message';
		cap(
			'Before service',
			'It waits for the lottery.',
			'Guests register from their own phones first; then the draw sets the line.',
		)(s);
	});

	// A tour of the line.
	at(C('tour'), (s) => {
		s.deskPhase = 'serving';
		s.kiosk = true;
		s.spot = 'waiting';
		cap(
			'The line',
			'Waiting is everyone in line.',
			'In the order they’ll be called, top first.',
		)(s);
	});
	spot(C('row'), 'row-1');
	at(C('row', 0.3), (s) => {
		s.spot = 'row-1';
		cap(
			'The line',
			'Number, name, and language.',
			'Greet each guest in the language they chose.',
		)(s);
	});
	spot(C('row', 0.62), 'lang-1');
	at(C('sections'), (s) => {
		s.spot = null;
		s.scrollTo = 'notplaced';
		cap(
			'The line',
			'Further down: Not placed, and Done.',
			'Guests who weren’t drawn today, and everyone you’ve served.',
		)(s);
	});
	spot(C('sections', 0.25), 'notplaced');
	at(C('sections', 0.62), (s) => {
		s.spot = 'done';
		s.scrollTo = 'done';
	});
	at(C('display'), (s) => {
		s.spot = null;
		s.scrollTo = null;
		s.lit = ['kiosk'];
		cap(
			'Room display',
			'The room sees numbers, never names.',
			'The same line as your screen, in English and a second language.',
		)(s);
	});

	// Calling a guest.
	at(C('call'), (s) => {
		s.lit = [];
		s.spot = 'callNext';
		cap('Calling', 'Tap Call next.', 'The next guest in line is called.')(s);
	});
	tap(E('call', -0.6), 'callNext', (s) => {
		s.spot = null;
		call(s, 1, E('call', -0.2));
		s.sheet = 1;
	});
	at(C('called'), (s) => {
		s.guestPhone = true;
		s.lit = ['kiosk', 'guest'];
		cap(
			'Calling',
			'Their number goes up, and their phone tells them.',
			'On the room display, and on their phone, in their language.',
		)(s);
	});
	at(C('ticket'), (s) => {
		s.lit = [];
		s.spot = 'timer';
		cap(
			'The ticket',
			'Their ticket opens straight away.',
			'The clock counts up from the moment you called.',
		)(s);
	});

	// The name tag.
	at(C('tag'), (s) => {
		s.spot = 'nametag';
		cap(
			'Name tag',
			'First name, last initial, number, language.',
			'The same tag for every guest.',
		)(s);
	});
	at(C('print'), (s) => {
		s.spot = 'print';
		cap(
			'Name tag',
			'Tap Print name tag.',
			'It prints at the print station on the market’s computer.',
		)(s);
	});
	tap(C('print', 0.45), 'print', (s) => {
		s.toast = T.printSent;
	});
	at(C('offline'), (s) => {
		s.toast = null;
		s.printOnline = false;
		cap('Name tag', 'Station offline? Write it by hand.', 'The button says so, and stays off.')(s);
	});
	at(E('offline', 0.3), (s) => {
		s.printOnline = true;
		s.spot = null;
	});

	// Serve and call next.
	at(C('serve'), (s) => {
		s.sheetTo = 'actions';
		s.spot = 'serveNext';
		cap(
			'Serve and call next',
			'Checked in? Serve and call next.',
			'It finishes their visit and calls the next guest, in one tap.',
		)(s);
	});
	tap(C('serve', 0.62), 'serveNext', (s) => {
		serve(s, 1);
		call(s, 2, C('serve', 0.66));
		s.sheet = 2;
		s.sheetTo = 'actions';
		s.spot = null;
	});
	at(C('rhythm'), (s) => {
		cap('Serve and call next', 'One tap per guest.', 'The next ticket opens in its place.')(s);
	});
	tap(C('rhythm', 0.5), 'serveNext', (s) => {
		serve(s, 2);
		call(s, 3, C('rhythm', 0.55));
		s.sheet = 3;
		s.sheetTo = 'actions';
	});
	at(C('together'), (s) => {
		s.spot = 'callNext';
		s.sheet = null;
		cap(
			'Two phones, one line',
			'Each tap calls a different guest.',
			'Several volunteers can run the desk at once. Nobody is called twice.',
		)(s);
	});

	// Late arrivals.
	at(C('late'), (s) => {
		s.spot = null;
		s.sheet = 3;
		s.sheetTo = null;
		s.featured = 3;
		s.lit = ['guest'];
		cap(
			'Late arrivals',
			'Not here yet? Don’t hold up the line.',
			'Close their ticket, and call the next guest.',
		)(s);
	});
	tap(C('late', 0.55), 'handle', (s) => {
		s.sheet = null;
	});
	tap(C('late', 0.85), 'callNext', (s) => {
		call(s, 4, C('late', 0.9));
	});
	at(C('lateWaits'), (s) => {
		s.spot = 'called';
		s.lit = ['guest', 'kiosk'];
		later(s, 2);
		cap(
			'Late arrivals',
			'They stay in Called, with the minutes since.',
			'Their phone warms to yellow and asks them to come to the check-in desk.',
		)(s);
	});
	// A few minutes pass while the line moves on: #4 is served, #5 is called and doesn't come.
	at(C('lateWaits', 0.25), (s) => {
		serve(s, 4);
		call(s, 5, C('lateWaits', 0.25));
		later(s, 2);
	});
	at(C('lateWaits', 0.5), (s) => {
		call(s, 6, C('lateWaits', 0.5));
		later(s, 2);
	});
	at(C('lateWaits', 0.75), (s) => {
		serve(s, 6);
		call(s, 7, C('lateWaits', 0.75));
		later(s, 4);
	});
	at(C('lateServe'), (s) => {
		s.lit = ['guest'];
		s.spot = 'row-3';
		cap(
			'Late arrivals',
			'When they arrive: Mark served.',
			'It doesn’t call anyone new, so the line stays where it is.',
		)(s);
	});
	tap(C('lateServe', 0.25), 'row-3', (s) => {
		s.spot = 'markServed';
		s.sheet = 3;
		s.sheetTo = 'actions';
	});
	tap(C('lateServe', 0.62), 'markServed', (s) => {
		serve(s, 3);
		s.sheet = null;
		s.spot = null;
	});

	// No-shows.
	at(C('noShow'), (s) => {
		s.lit = [];
		s.guestPhone = false;
		s.spot = 'row-5';
		cap(
			'No-shows',
			'Still not here? Mark no show.',
			'They move to a No-shows list of their own.',
		)(s);
	});
	tap(C('noShow', 0.25), 'row-5', (s) => {
		s.sheet = 5;
		s.sheetTo = 'actions';
		s.spot = 'noShowBtn';
	});
	tap(C('noShow', 0.55), 'noShowBtn', (s) => {
		g(s, 5).status = 'no_show';
		g(s, 5).history.push(['no_show', T.historyKinds.no_show, 'By Jordan', '11:46 AM']);
		s.sheet = null;
		s.spot = null;
	});
	at(C('noShow', 0.7), (s) => {
		s.scrollTo = 'noshows';
		s.spot = 'noshows';
	});
	at(C('returnBack'), (s) => {
		s.spot = 'row-5';
		cap('No-shows', 'Turned up after all? Return to back of line.', 'They keep their number.')(s);
	});
	tap(C('returnBack', 0.3), 'row-5', (s) => {
		s.sheet = 5;
		s.sheetTo = 'actions';
		s.spot = 'returnBack';
	});
	at(C('returnFront'), (s) => {
		s.spot = 'returnArrow';
		cap('No-shows', 'The arrow offers the front.', 'For a guest you called by mistake.')(s);
	});
	tap(C('returnFront', 0.3), 'returnArrow', (s) => {
		s.menu = 'return';
		s.spot = 'returnFrontItem';
	});
	tap(E('returnFront', 0.2), 'returnBackItem', (s) => {
		const x = g(s, 5);

		x.status = 'waiting';
		x.order = 100;
		x.history.push(['returned', T.historyKinds.returned + ' to the back', 'By Jordan', '11:51 AM']);
		s.menu = null;
		s.sheet = null;
		s.scrollTo = null;
		s.spot = null;
	});

	// Adding a guest by hand.
	at(C('add'), (s) => {
		s.spot = 'add';
		cap('Adding a guest', 'Tap Add guest, beside Waiting.', 'To put someone in line yourself.')(s);
	});
	tap(C('add', 0.7), 'add', (s) => {
		s.spot = null;
		s.dialog = 'add';
	});
	at(C('addForm'), (s) => {
		cap(
			'Adding a guest',
			'Their details, and Give them a spot.',
			'Then where they go: the end of the queue, or next up.',
		)(s);
	});
	let typed = type(C('addForm', 0.04), 'first', TYPED.first);

	typed = type(typed, 'last', TYPED.last);
	type(typed, 'phone', TYPED.phone);
	at(C('addForm', 0.62), (s) => {
		s.form.focus = null;
		s.spot = 'admission';
	});
	at(C('addForm', 0.82), (s) => {
		s.spot = 'placement';
	});
	at(C('addPriority'), (s) => {
		cap(
			'Adding a guest',
			'Next up gets a P number.',
			'P1, P2… so nobody else’s number changes.',
		)(s);
	});
	tap(C('addPriority', 0.2), 'placement', (s) => {
		s.form.placement = 'next';
	});
	tap(C('addPriority', 0.55), 'save', (s) => {
		const x = g(s, WALK_IN);

		s.dialog = null;
		s.spot = 'row-' + WALK_IN;
		s.banner = true;
		Object.assign(x, { place: 'shown', front: true, order: 0 });
		x.history.push(['added', T.historyKinds.added, 'By Jordan', '11:52 AM']);
	});
	at(C('qr'), (s) => {
		s.spot = 'qrButton';
		cap(
			'Adding a guest',
			'Show QR code for their phone.',
			'They scan it with their camera, and their phone follows their place in line.',
		)(s);
	});
	tap(C('qr', 0.3), 'qrButton', (s) => {
		s.spot = null;
		s.dialog = 'qr';
	});
	tap(E('qr', 0.1), 'qrDone', (s) => {
		s.dialog = null;
		s.banner = false;
	});

	// Reaching a guest, and what happened so far.
	at(C('phone'), (s) => {
		s.sheet = 7;
		s.sheetTo = 'actions';
		s.spot = 'phone';
		cap(
			'On every ticket',
			'Phone calls the guest.',
			'History shows who called and served them, and when.',
		)(s);
	});
	at(C('phone', 0.55), (s) => {
		s.sheetTo = 'history';
		s.spot = 'history';
	});

	// Ending the day: the rest of the line goes through quickly.
	at(C('finish'), (s) => {
		s.sheet = null;
		s.spot = null;
		s.kiosk = false;
		cap(
			'End of the day',
			'Everyone through? Close session.',
			'Call next turns into Close session once nobody is left.',
		)(s);
	});
	const rest = [WALK_IN, ...Array.from({ length: DRAWN - 7 }, (_, i) => i + 8), 5];

	rest.forEach((n, i) =>
		at(C('finish', 0.08 + (i * 0.6) / rest.length), (s) => {
			for (const x of s.guests) {
				if (x.status === 'called') {
					serve(s, x.n);
				}
			}
			call(s, n, C('finish', 0.1));
		}),
	);
	at(C('finish', 0.72), (s) => {
		for (const x of s.guests) {
			if (x.status === 'called') {
				serve(s, x.n);
			}
		}
		s.spot = 'callNext';
	});
	at(C('close'), (s) => {
		cap(
			'End of the day',
			'Tap it, and confirm.',
			'The menu at the top can close the session early, too.',
		)(s);
	});
	tap(C('close', 0.12), 'callNext', (s) => {
		s.spot = null;
		s.confirm = true;
	});
	tap(C('close', 0.3), 'confirmGo', (s) => {
		s.confirm = false;
		s.deskPhase = 'ended';
	});
	at(C('close', 0.42), (s) => {
		s.callout = true;
		cap(
			'End of the day',
			'Closing early marks the rest as no-shows.',
			'The confirmation says how many first.',
		)(s);
	});
	at(C('thanks'), (s) => {
		s.callout = false;
		s.desk = false;
		s.cap = null;
		s.phase = 'outro';
		s.outro = true;
	});

	const END = E('thanks', 4);
	const snaps = snapshots();

	/* ================= views ================= */

	/** Class names for an element the narration taps or points at. */
	const marks = (s: Pick<DeskState, 'tap' | 'spot'>, key: string) =>
		(s.tap === key ? ' tapping' : '') + (s.spot === key ? ' spot' : '');
	/** `11h 5m 8s`, dropping leading units that are zero, as TicketSummary shows it. */
	const formatElapsed = (seconds: number) => {
		const total = Math.max(0, Math.floor(seconds));
		const m = Math.floor(total / 60);

		return m ? m + 'm ' + (total % 60) + 's' : total + 's';
	};
	const fullName = (x: DeskGuest) => x.first + ' ' + x.last;
	const roster = (s: DeskState) => {
		const shown = s.guests.filter((x) => x.place === 'shown');
		const called = shown
			.filter((x) => x.status === 'called')
			.sort((a, b) => (a.calledT ?? 0) - a.lag - ((b.calledT ?? 0) - b.lag));

		return {
			called,
			waiting: shown
				.filter((x) => x.status === 'waiting')
				.sort((a, b) => Number(b.front) - Number(a.front) || a.order - b.order),
			noShows: shown.filter((x) => x.status === 'no_show'),
			notPlaced: shown.filter((x) => x.status === 'not_placed'),
			done: shown.filter((x) => x.status === 'served'),
			mostRecent: called.length ? called[called.length - 1]! : null,
		};
	};

	function chip(s: DeskState, x: DeskGuest) {
		const elapsed =
			x.status === 'called'
				? x.minutes
					? T.elapsedMinutes.replace('{minutes}', String(x.minutes))
					: T.elapsedJustNow
				: '';

		return (
			'<li class="chip' +
			marks(s, 'row-' + x.n) +
			'" data-status="' +
			x.status +
			'"><span class="number">' +
			esc(label(x)) +
			'</span><span class="name">' +
			esc(fullName(x)) +
			'</span><span class="lang' +
			marks(s, 'lang-' + x.n) +
			'">' +
			x.loc.toUpperCase() +
			'</span><span class="el">' +
			esc(elapsed) +
			'</span></li>'
		);
	}

	function section(
		s: DeskState,
		key: string,
		title: string,
		list: DeskGuest[],
		empty?: string,
		action = '',
	) {
		if (!list.length && empty === undefined) {
			return '';
		}

		return (
			'<section class="tsection' +
			marks(s, key) +
			'" data-section="' +
			key +
			'"><header><h2>' +
			esc(title) +
			' <span class="count">' +
			list.length +
			'</span></h2>' +
			action +
			'</header>' +
			(list.length
				? '<ul>' + list.map((x) => chip(s, x)).join('') + '</ul>'
				: '<p class="empty">' + esc(empty) + '</p>') +
			'</section>'
		);
	}

	function header(s: DeskState) {
		return (
			'<header class="dh"><div><h1>' +
			esc(T.title) +
			'</h1><p class="status">' +
			esc(T.serving) +
			'</p></div><span class="kebab">⋮</span>' +
			(s.menu === 'kebab'
				? '<div class="menu menu-kebab"><span>' +
					esc(T.openDashboard) +
					'</span><span class="danger">' +
					esc(T.closeSession) +
					'</span></div>'
				: '') +
			'</header>'
		);
	}

	function deskBodyHtml(s: DeskState) {
		if (s.deskPhase === 'not_started' || s.deskPhase === 'ended') {
			const text = s.deskPhase === 'ended' ? T.ended : T.queueNotStarted;

			return (
				'<section class="message' +
				marks(s, 'message') +
				'"><p>' +
				esc(text) +
				'</p><span class="outlined">' +
				esc(T.openDashboard) +
				'</span></section>'
			);
		}
		const r = roster(s);
		const walkIn = g(s, WALK_IN);

		return (
			header(s) +
			(s.banner
				? '<div class="banner"><p>' +
					esc(T.guestAdded.replace('{name}', fullName(walkIn))) +
					'</p><span class="outlined' +
					marks(s, 'qrButton') +
					'">' +
					esc(T.guestClaimShow) +
					'</span></div>'
				: '') +
			section(s, 'called', T.called, r.called, T.noneCalled) +
			section(
				s,
				'waiting',
				T.waiting,
				r.waiting,
				T.noneWaiting,
				'<span class="add' + marks(s, 'add') + '">+ ' + esc(T.addGuest) + '</span>',
			) +
			section(s, 'noshows', T.noShows, r.noShows) +
			section(s, 'notplaced', T.notPlaced, r.notPlaced) +
			section(s, 'done', T.done, [...r.done].reverse(), T.noneDone)
		);
	}

	function actionsHtml(s: DeskState, x: DeskGuest) {
		const r = roster(s);
		const offersServeAndCallNext = r.mostRecent?.n === x.n && r.waiting.length > 0;
		const button = (key: string, text: string, primary: boolean) =>
			'<span class="' + (primary ? 'primary' : '') + marks(s, key) + '">' + esc(text) + '</span>';
		const parts: string[] = [];

		if (offersServeAndCallNext) {
			parts.push(button('serveNext', T.serveAndCallNext, true));
		}

		if (x.status === 'called') {
			parts.push(button('markServed', T.markServed, !offersServeAndCallNext));
		}

		if (x.status === 'waiting') {
			parts.push(button('callGuest', 'Call guest', true));
		}

		if (x.status === 'called' || x.status === 'waiting') {
			parts.push(button('noShowBtn', T.markNoShow, false));
		}

		if (x.status === 'called' || x.status === 'no_show') {
			parts.push(
				'<span class="split">' +
					button('returnBack', T.returnToBack, false) +
					button('returnArrow', '▾', false) +
					'</span>',
			);
		}
		parts.push(button('phone', T.phoneGuest, false));
		const menu =
			s.menu === 'return'
				? '<div class="menu menu-return"><span class="' +
					marks(s, 'returnBackItem').trim() +
					'">' +
					esc(T.returnToBack) +
					'</span><span class="' +
					marks(s, 'returnFrontItem').trim() +
					'">' +
					esc(T.returnToFront) +
					'</span></div>'
				: '';

		return '<div class="actions" data-anchor="actions">' + parts.join('') + menu + '</div>';
	}

	function sheetHtml(s: DeskState, x: DeskGuest) {
		const called = x.status === 'called';
		const tagName = x.first + ' ' + x.last.charAt(0) + '.';
		const history = x.history
			.map(
				([, title, byline, time]) =>
					'<li><span class="title">' +
					esc(title) +
					'</span><span class="byline">' +
					esc(byline) +
					'</span><time>' +
					esc(time) +
					'</time></li>',
			)
			.join('');

		return (
			'<span class="handle' +
			marks(s, 'handle') +
			'"></span>' +
			'<section class="summary"><div class="ticket"><p class="label">' +
			esc(T.ticket) +
			'</p><p class="num">' +
			esc(label(x)) +
			'</p></div><p class="st" data-status="' +
			x.status +
			'"><span>' +
			esc(T.statuses[x.status as keyof typeof T.statuses]) +
			'</span>' +
			(called
				? '<span class="timer' + marks(s, 'timer') + '" data-timer="' + x.n + '"></span>'
				: '') +
			'</p></section>' +
			'<figure class="nametag' +
			marks(s, 'nametag') +
			'"><figcaption>' +
			esc(T.nameTag) +
			'</figcaption><p class="nm">' +
			esc(tagName) +
			'</p><p class="dt"><span class="pos">#' +
			esc(label(x)) +
			'</span><span class="lg">' +
			x.loc.toUpperCase() +
			'</span></p></figure>' +
			'<div class="print"><div class="printbtn' +
			(s.printOnline ? '' : ' disabled') +
			marks(s, 'print') +
			'">' +
			esc(T.printNameTag) +
			'</div><p>' +
			esc(s.printOnline ? T.printsAtStation : T.printStationIsOffline) +
			'</p></div>' +
			'<p class="gdetails"><span>' +
			esc(T.household.replace('{count}', String(x.household))) +
			'</span><span>' +
			ENGLISH[x.loc] +
			'</span></p>' +
			actionsHtml(s, x) +
			'<section class="history' +
			marks(s, 'history') +
			'" data-anchor="history"><h2>' +
			esc(T.historyTitle) +
			'</h2><ol>' +
			history +
			'</ol></section>'
		);
	}

	function field(s: DeskState, key: string, labelText: string, value: string, extra = '') {
		return (
			'<div class="field' +
			(s.form.focus === key ? ' focus' : '') +
			extra +
			marks(s, key) +
			'"><label>' +
			esc(labelText) +
			'</label><span>' +
			esc(value) +
			'</span></div>'
		);
	}

	function overlayHtml(s: DeskState, which: 'add' | 'qr') {
		if (which === 'add') {
			return (
				'<div class="dialog"><h2>' +
				esc(T.manualGuestTitle) +
				'</h2>' +
				field(s, 'first', T.firstName + ' *', s.form.first) +
				field(s, 'last', T.lastName + ' *', s.form.last) +
				field(s, 'phone', T.phone + ' *', s.form.phone) +
				field(s, 'admission', T.admissionLabel, T.admitToQueue, ' select') +
				field(
					s,
					'placement',
					T.queuePlacement,
					s.form.placement === 'next' ? T.placeNext : T.placeEnd,
					' select',
				) +
				'<div class="dialog-actions"><span>' +
				esc(T.cancel) +
				'</span><span class="contained' +
				marks(s, 'save') +
				'">' +
				esc(T.saveGuest) +
				'</span></div></div>'
			);
		}
		const walkIn = g(s, WALK_IN);

		return (
			'<div class="dialog"><h2>' +
			esc(T.guestClaimTitle) +
			'</h2><div class="qr">' +
			QR +
			'</div><p>' +
			esc(
				T.guestClaimInstructions.replace('{name}', fullName(walkIn)).replace('{time}', '12:07 PM'),
			) +
			'</p><div class="dialog-actions"><span class="contained' +
			marks(s, 'qrDone') +
			'">' +
			esc(T.guestClaimDone) +
			'</span></div></div>'
		);
	}

	function confirmHtml(s: Pick<DeskState, 'tap' | 'spot'>, outstanding: number) {
		return (
			'<h2>' +
			esc(T.confirmCloseSession) +
			'</h2>' +
			(outstanding
				? '<p>' +
					esc(T.confirmCloseSessionOutstanding.replace('{count}', String(outstanding))) +
					'</p>'
				: '') +
			'<div class="buttons"><span class="go' +
			marks(s, 'confirmGo') +
			'">' +
			esc(T.confirmContinue) +
			'</span><span>' +
			esc(T.cancel) +
			'</span></div>'
		);
	}

	/** A stand-in QR code: the three finder squares and a fixed scatter. It encodes nothing. */
	const QR = (() => {
		const n = 25;
		let seed = 7;
		const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
		let cells = '';
		const finder = (x: number, y: number) =>
			'<rect x="' +
			x +
			'" y="' +
			y +
			'" width="7" height="7"/>' +
			'<rect x="' +
			(x + 1) +
			'" y="' +
			(y + 1) +
			'" width="5" height="5" fill="#fff"/>' +
			'<rect x="' +
			(x + 2) +
			'" y="' +
			(y + 2) +
			'" width="3" height="3"/>';
		const inFinder = (x: number, y: number) =>
			(x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);

		for (let y = 0; y < n; y++) {
			for (let x = 0; x < n; x++) {
				if (!inFinder(x, y) && rnd() < 0.48) {
					cells += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
				}
			}
		}

		return (
			'<svg viewBox="0 0 ' +
			n +
			' ' +
			n +
			'" fill="#023940" shape-rendering="crispEdges">' +
			finder(0, 0) +
			finder(n - 7, 0) +
			finder(0, n - 7) +
			cells +
			'</svg>'
		);
	})();

	/* ================= rendering ================= */

	const deskEl = k('desk');
	const deskBody = k('deskBody');
	const sheetEl = k('sheet');
	const overlayEl = k('overlay');
	const confirmEl = k('confirm');
	const toastEl = k('toast');
	const callNextEl = k('callNext');
	const calloutEl = k('callout');
	const guestEl = k('stage').appendChild(phoneFrame('11:32'));

	guestEl.id = 'guestPhone';

	/** Scrolls a list so that the element `anchor` names sits near the top of what shows. */
	function scrollTo(inner: HTMLElement, anchor: string | null, visible: number) {
		const target =
			anchor &&
			inner.querySelector<HTMLElement>(
				'[data-section="' + anchor + '"], [data-anchor="' + anchor + '"]',
			);
		const most = Math.max(0, inner.scrollHeight - visible);
		const y = target ? Math.min(most, Math.max(0, target.offsetTop - 24)) : 0;

		inner.style.transform = 'translateY(' + -y + 'px)';
	}

	function renderDesk(s: DeskState) {
		put(deskBody, deskBodyHtml(s));
		scrollTo(deskBody, s.scrollTo, 704);

		const r = roster(s);
		const complete =
			s.deskPhase === 'serving' && !r.called.length && !r.waiting.length && r.done.length > 0;

		callNextEl.parentElement!.hidden = s.deskPhase !== 'serving';
		put(callNextEl, esc(complete ? T.closeSession : T.callNext));
		callNextEl.className = 'mui-btn' + (complete ? ' danger' : '') + marks(s, 'callNext');

		deskEl.classList.toggle('sheet-open', s.sheet !== null);

		if (s.sheet !== null) {
			put(sheetEl, sheetHtml(s, g(s, s.sheet)));
			scrollTo(sheetEl, s.sheetTo, 700);
		}
		overlayEl.classList.toggle('open', s.dialog !== null);

		if (s.dialog !== null) {
			put(overlayEl, overlayHtml(s, s.dialog));
		}
		deskEl.classList.toggle('confirm-open', s.confirm);
		put(confirmEl, confirmHtml(s, 0));
		put(toastEl, s.toast ? '<div class="toast">' + esc(s.toast) + '</div>' : '');
		calloutEl.classList.toggle('on', s.callout);
		put(
			calloutEl,
			'<div class="from">From the ⋮ menu, with guests left</div><div class="confirm">' +
				confirmHtml({ tap: null, spot: null }, 3) +
				'</div>',
		);
	}

	function renderGuest(s: DeskState) {
		const x = g(s, s.featured);

		renderGuestPhone(guestEl, guestApp(x.loc, statusHtml(s, x)), x.status);
		guestEl.classList.toggle('dim', !s.lit.includes('guest'));
		k('kiosk').classList.toggle('dim', !s.lit.includes('kiosk'));
	}

	const stage = k('stage');
	let lastIndex = -1;
	const kioskIn = snaps.find((snap) => snap.s.kiosk)?.t ?? 0;

	function renderAt(time: number) {
		const i = snapshotAt(snaps, time);
		const s = snaps[i]!.s;

		if (i !== lastIndex) {
			lastIndex = i;
			stage.dataset.phase = s.phase;
			renderDesk(s);
			renderGuest(s);
			renderCaption(s);
		}
		// The second language on the room display moves on every few seconds.
		renderKiosk(s, Math.max(0, Math.floor((time - kioskIn) / 3.4)));

		// The open ticket's clock ticks every frame; the rest only changes on a beat.
		for (const el of sheetEl.querySelectorAll<HTMLElement>('[data-timer]')) {
			const x = g(s, Number(el.dataset.timer));
			const seconds = x.calledT === null ? 0 : time - x.calledT + x.lag;

			el.textContent = formatElapsed(seconds);
		}
	}

	/* ================= timeline ================= */

	const tl = gsap.timeline({
		id: 'Queue Desk Training',
		paused: true,
		onUpdate: () => renderAt(tl.time()),
	});

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

	// Where each screen sits on the 1920×1080 stage, and how it slides in.
	const place = {
		desk: { el: '#desk', label: '#zDesk', x: 834, y: 70, scale: 1.2, from: { y: 160 } },
		kiosk: { el: '#kiosk', label: '#zKiosk', x: 70, y: 590, scale: 0.66, from: { x: -300 } },
		guestPhone: {
			el: '#guestPhone',
			label: '#zGuest',
			x: 1404,
			y: 236,
			scale: 0.8,
			from: { x: 1700 },
		},
	};

	for (const { el, x, y, scale } of Object.values(place)) {
		gsap.set(el, { x, y, scale, transformOrigin: '0 0', opacity: 0 });
	}
	gsap.set('#title', { opacity: 1 });

	for (let b = 1; b < snaps.length; b++) {
		const prev = snaps[b - 1]!.s,
			cur = snaps[b]!.s,
			t = snaps[b]!.t;

		for (const [key, { el, label: labelEl, x, y, from }] of Object.entries(place) as [
			keyof typeof place,
			(typeof place)[keyof typeof place],
		][]) {
			if (prev[key] === cur[key]) {
				continue;
			}
			const shown = { x, y, opacity: 1 };
			const hidden = { x, y, ...from, opacity: 0 };

			tl.fromTo(
				el,
				cur[key] ? hidden : shown,
				{
					...(cur[key] ? shown : hidden),
					duration: 1.1,
					ease: 'power3.out',
					immediateRender: false,
				},
				t,
			);
			tl.fromTo(
				labelEl,
				{ opacity: cur[key] ? 0 : 1 },
				{ opacity: cur[key] ? 1 : 0, duration: 0.6, immediateRender: false },
				t + (cur[key] ? 0.8 : 0),
			);
		}

		if (prev.title && !cur.title) {
			tl.to('#title', { opacity: 0, scale: 1.04, duration: 0.6, ease: 'power2.in' }, t);
		}

		if (!prev.outro && cur.outro) {
			tl.fromTo(
				'#outro',
				{ opacity: 0, scale: 0.96 },
				{ opacity: 1, scale: 1, duration: 1.2, ease: 'power3.out', immediateRender: false },
				t + 0.7,
			);
			tl.fromTo(
				'#outro .tags span',
				{ opacity: 0, y: 16 },
				{
					opacity: 1,
					y: 0,
					duration: 0.5,
					stagger: 0.18,
					ease: 'power2.out',
					immediateRender: false,
				},
				t + 1.6,
			);
		}
	}

	window.stage.mountPlayer({
		tl,
		END,
		snaps,
		describeBeat,
		source: 'queue-desk/page.ts',
		cues: [...CUES.values()],
		chapters: CHAPTER_CUES,
		chapterTitle: (key) => CHAPTERS[key] ?? key,
	});

	/** What a beat changed, for the #dev beat list. */
	function describeBeat(prev: DeskState, cur: DeskState) {
		const items: string[] = [];
		let minor: string | null = null;

		for (const key of [
			'title',
			'desk',
			'kiosk',
			'guestPhone',
			'outro',
			'callout',
			'banner',
			'confirm',
		] as const) {
			if (prev[key] !== cur[key]) {
				items.push(key + (cur[key] ? ' in' : ' out'));
			}
		}

		if (prev.deskPhase !== cur.deskPhase) {
			items.push('Desk: ' + cur.deskPhase);
		}

		if (cur.cap && prev.cap?.head !== cur.cap.head) {
			items.push('Caption: “' + cur.cap.head + '”');
		}

		if (prev.tap !== cur.tap && cur.tap) {
			items.push('Tap: ' + cur.tap);
		}

		if (prev.spot !== cur.spot && cur.spot) {
			items.push('Point at ' + cur.spot);
		}

		if (prev.sheet !== cur.sheet) {
			items.push(
				cur.sheet === null ? 'Ticket closes' : 'Ticket #' + label(g(cur, cur.sheet)) + ' opens',
			);
		}

		if (prev.dialog !== cur.dialog) {
			items.push(cur.dialog ? 'Dialog: ' + cur.dialog : 'Dialog closes');
		}

		if (prev.menu !== cur.menu) {
			items.push(cur.menu ? 'Menu: ' + cur.menu : 'Menu closes');
		}

		if (prev.featured !== cur.featured) {
			items.push('Guest phone shows #' + cur.featured);
		}
		cur.guests.forEach((x, i) => {
			const was = prev.guests[i]!;

			if (was.status !== x.status) {
				items.push('#' + label(x) + ' → ' + x.status);
			}
		});

		if (!items.length && JSON.stringify(prev.form) !== JSON.stringify(cur.form)) {
			minor = 'Typing';
		}

		return { items, minor };
	}
});
