/**
 * The market day reel: one minute, no words. A guest registers on their phone, the lottery is
 * drawn, and the line moves through the room display and the volunteer's queue desk. Waits for the
 * stage, which the build inlines after this script.
 */
import type { Locale } from '../../../src/locales.ts';
import type { Caption, StageGuest } from '../stage/stage.ts';

type Place = 'hidden' | 'solo' | 'grid' | 'row' | 'dropped' | 'checkin' | 'gone';

interface ReelGuest extends StageGuest {
	place: Place;
	/** How long ago the desk called them, as the desk's chip shows it. */
	elapsed: string;
}

type Field = 'first' | 'last' | 'phone';

interface ReelState {
	phase: 'title' | 'solo' | 'grid' | 'row' | 'outro';
	guests: ReelGuest[];
	heroLang: Locale;
	/** Seconds left to register. */
	clock: number;
	typed: Record<Field, string>;
	focus: Field | null;
	nowCalling: number | null;
	/** The guest whose ticket is open at the desk, by number. */
	sheet: number | null;
	sheetMode: 'next' | 'served';
	tap: string | null;
	cap: Caption | null;
	kiosk: boolean;
	desk: boolean;
	title: boolean;
	outro: boolean;
}

document.addEventListener('DOMContentLoaded', () => {
	const { S, LANGS, ENGLISH, RTL, esc, k, beatScript, snapshotAt, cap, put } = window.stage;
	const { statusHtml, guestApp, phoneFrame, renderGuestPhone, renderKiosk, renderCaption } =
		window.stage;
	// Fictional guests. The first one registers on screen; the rest join the line around them.
	const PEOPLE: [string, string, Locale][] = [
		['Reza', 'Karimi', 'fa'],
		['Luis', 'Herrera', 'es'],
		['Mai', 'Nguyen', 'vi'],
		['Wei', 'Chen', 'zh'],
		['Grace', 'Okafor', 'en'],
		['Amal', 'Haddad', 'ar'],
		['Josefina', 'Reyes', 'tl'],
		['Claire', 'Dubois', 'fr'],
		['Ana', 'Morales', 'es'],
		['Daniel', 'Brooks', 'en'],
		['Linh', 'Tran', 'vi'],
		['Carmen', 'Ruiz', 'es'],
		['Hassan', 'Nouri', 'fa'],
		['Mei', 'Lin', 'zh'],
		['Paolo', 'Santos', 'tl'],
		['Layla', 'Saleh', 'ar'],
		['Marcus', 'Hill', 'en'],
		['Sofia', 'Vargas', 'es'],
		['Thanh', 'Pham', 'vi'],
		['Ali', 'Rahimi', 'fa'],
		['Rosa', 'Mendoza', 'es'],
		['Jun', 'Wang', 'zh'],
		['Nadia', 'Khalil', 'ar'],
		['Ellen', 'Park', 'en'],
		['Rafael', 'Cruz', 'tl'],
		['Amélie', 'Laurent', 'fr'],
		['Diego', 'Ortiz', 'es'],
		['Kim', 'Le', 'vi'],
		['Omar', 'Aziz', 'ar'],
		['Teresa', 'Gómez', 'es'],
		// Registered, but not drawn today.
		['Samuel', 'Ortega', 'es'],
		['Huong', 'Vo', 'vi'],
		['Farah', 'Ansari', 'fa'],
	];
	/** Numbers 1–30 are drawn; the rest of the registrants are not placed. */
	const PLACED = 30;
	/** The guest who registers on screen, and is drawn number 5. */
	const SOLO = 5;
	/** The order guests registered in, which is the order of the grid; the draw sets the line. */
	const REG_ORDER = [
		5, 12, 31, 1, 22, 8, 17, 3, 27, 10, 14, 32, 2, 25, 19, 6, 30, 11, 4, 23, 9, 16, 28, 33, 13, 7,
		20, 26, 15, 29, 18, 24, 21,
	];
	/** Everything after the draw runs this much later than it did before the lottery step. */
	const SHIFT = 2.2;
	const TYPED: Record<Field, string> = { first: 'Grace', last: 'Okafor', phone: '(510) 555-0142' };

	/* ================= state script ================= */

	const initial: ReelState = {
		phase: 'title',
		guests: PEOPLE.map(([first, last, loc], i) => ({
			n: i + 1,
			first,
			last,
			loc,
			status: 'hidden',
			place: 'hidden',
			warmth: 0,
			elapsed: '',
		})),
		heroLang: 'en',
		clock: 372,
		typed: { first: '', last: '', phone: '' },
		focus: null,
		nowCalling: null,
		sheet: null,
		sheetMode: 'next',
		tap: null,
		cap: null,
		kiosk: false,
		desk: false,
		title: true,
		outro: false,
	};
	const { at, snapshots } = beatScript(initial);
	const g = (s: ReelState, n: number) => s.guests[n - 1]!;
	const call = (s: ReelState, n: number) => {
		const x = g(s, n);

		x.status = 'called';
		x.elapsed = 'now';
		s.nowCalling = n;
	};
	const serve = (s: ReelState, n: number) => {
		g(s, n).status = 'served';
		g(s, n).elapsed = '';
	};

	at(3.5, (s) => {
		s.title = false;
	});
	at(4.0, (s) => {
		s.phase = 'solo';
		Object.assign(g(s, SOLO), { status: 'hero', place: 'solo' });
		cap(
			'Guests',
			'Neighbors register from their own phones.',
			'In eight languages, right-to-left included.',
		)(s);
	});
	(['es', 'tl', 'zh', 'fa', 'ar', 'vi', 'fr', 'en'] as const).forEach((code, i) =>
		at(4.9 + i * 0.42, (s) => {
			s.heroLang = code;
		}),
	);
	at(8.4, (s) => {
		s.tap = 'pill-en';
	});
	at(8.8, (s) => {
		s.tap = null;
		g(s, SOLO).status = 'form';
		s.focus = 'first';
		cap(
			'Guests',
			'Neighbors register from their own phones.',
			'Right in the browser. Nothing to install.',
		)(s);
	});
	let t = 9.1;

	for (const field of ['first', 'last', 'phone'] as const) {
		at(t, (s) => {
			s.focus = field;
		});

		for (let i = 1; i <= TYPED[field].length; i++) {
			at(t + i * 0.055, (s) => {
				s.typed[field] = TYPED[field].slice(0, i);
			});
		}
		t += TYPED[field].length * 0.055 + 0.25;
	}
	at(t + 0.1, (s) => {
		s.focus = null;
		s.tap = 'submit';
	});
	at(t + 0.55, (s) => {
		s.tap = null;
		g(s, SOLO).status = 'registered';
		cap(
			'The lottery',
			'Every guest is entered in the day’s lottery.',
			'Everyone who registers before the window closes has the same chance.',
		)(s);
	});

	for (let tick = Math.ceil(t + 1); tick < 15.2; tick++) {
		at(tick, (s) => {
			s.clock -= 1;
		});
	}

	at(15.2, (s) => {
		s.phase = 'grid';
		s.guests.forEach((x) => {
			x.status = 'registered';
			x.place = 'grid';
		});
		cap(
			'Registration window',
			'Then the whole neighborhood signs up.',
			'Every phone speaks its guest’s language.',
		)(s);
	});
	// The window runs out in fast-forward.
	const ffStart = 16.4,
		ffSteps = 24,
		ffStep = 0.065;

	for (let i = 1; i <= ffSteps; i++) {
		at(ffStart + i * ffStep, (s) => {
			s.clock = Math.round(360 * (1 - i / ffSteps));
		});
	}
	const DRAW_AT = 18.2;

	at(DRAW_AT, (s) => {
		cap(
			'The draw',
			'Everyone has the same chance.',
			'Not everyone gets a number. Each phone shows the result the moment it’s drawn.',
		)(s);
	});
	// Revealed in a scattered order, so the numbers land across the grid rather than in a sweep.
	const REVEAL_ORDER = [...REG_ORDER].sort((a, b) => ((a * 7919) % 33) - ((b * 7919) % 33));
	const REVEALS = REVEAL_ORDER.map((_n, k) => DRAW_AT + 0.35 + k * 0.055);

	REVEAL_ORDER.forEach((n, k) =>
		at(REVEALS[k]!, (s) => {
			g(s, n).status = n <= PLACED ? 'waiting' : 'not_placed';
		}),
	);
	at(21.0, (s) => {
		s.guests.forEach((x) => {
			if (x.status === 'not_placed') {
				x.place = 'dropped';
			}
		});
	});
	at(19.4 + SHIFT, (s) => {
		s.phase = 'row';
		s.guests.forEach((x) => {
			if (x.place === 'grid') {
				x.place = 'row';
			}
		});
		s.kiosk = true;
		s.desk = true;
		cap(
			'The room and the desk',
			'A board for the room. A phone for the volunteer.',
			'Everyone sees the same line, at the same moment.',
		)(s);
	});

	// Calling, check-in, and a late arrival.
	at(22.2 + SHIFT, (s) => {
		s.tap = 'callNext';
	});
	at(22.65 + SHIFT, (s) => {
		s.tap = null;
		call(s, 1);
		cap(
			'Calling',
			'One tap calls the next guest.',
			'Their number lights up on the board and on their phone.',
		)(s);
	});
	at(23.9 + SHIFT, (s) => {
		g(s, 1).place = 'checkin';
		s.sheet = 1;
		s.sheetMode = 'next';
		cap(
			'Check-in',
			'Their ticket and name tag open at the desk.',
			'The tag prints at the print station with one tap.',
		)(s);
	});
	at(26.2 + SHIFT, (s) => {
		s.tap = 'serveNext';
	});
	at(26.65 + SHIFT, (s) => {
		s.tap = null;
		serve(s, 1);
		call(s, 2);
		s.sheet = 2;
		cap(
			'Check-in',
			'Serve and call next, in a single tap.',
			'The next ticket opens in its place.',
		)(s);
	});
	at(27.5 + SHIFT, (s) => {
		g(s, 1).place = 'gone';
		g(s, 2).place = 'checkin';
	});
	at(29.2 + SHIFT, (s) => {
		s.tap = 'serveNext';
	});
	at(29.65 + SHIFT, (s) => {
		s.tap = null;
		serve(s, 2);
		call(s, 3);
		s.sheet = 3;
	});
	at(30.5 + SHIFT, (s) => {
		g(s, 2).place = 'gone';
		cap(
			'Late arrivals',
			'Running behind? Their number stays called.',
			'It moves to Already Called on the board.',
		)(s);
	});
	at(31.6 + SHIFT, (s) => {
		s.sheet = null;
	});
	at(32.1 + SHIFT, (s) => {
		s.tap = 'callNext';
	});
	at(32.55 + SHIFT, (s) => {
		s.tap = null;
		call(s, 4);
		s.sheet = 4;
		g(s, 3).warmth = 0.3;
		g(s, 3).elapsed = '2m';
	});
	at(33.4 + SHIFT, (s) => {
		g(s, 4).place = 'checkin';
	});
	at(34.4 + SHIFT, (s) => {
		g(s, 3).warmth = 0.65;
		g(s, 3).elapsed = '4m';
		cap(
			'Late arrivals',
			'As the line moves on, their board warms to yellow.',
			'Their phone tells them others are waiting behind them.',
		)(s);
	});
	at(35.6 + SHIFT, (s) => {
		g(s, 3).warmth = 1;
		g(s, 3).elapsed = '6m';
	});
	at(36.4 + SHIFT, (s) => {
		s.tap = 'serveNext';
	});
	at(36.85 + SHIFT, (s) => {
		s.tap = null;
		serve(s, 4);
		call(s, 5);
		s.sheet = 5;
	});
	at(37.7 + SHIFT, (s) => {
		g(s, 4).place = 'gone';
		g(s, 3).place = 'checkin';
		s.sheet = null;
		cap(
			'Late arrivals',
			'When they arrive, they’re served right away.',
			'Marking them served doesn’t move the line ahead.',
		)(s);
	});
	at(38.6 + SHIFT, (s) => {
		s.tap = 'chip-3';
	});
	at(39.0 + SHIFT, (s) => {
		s.tap = null;
		s.sheet = 3;
		s.sheetMode = 'served';
	});
	at(40.2 + SHIFT, (s) => {
		s.tap = 'markServed';
	});
	at(40.65 + SHIFT, (s) => {
		s.tap = null;
		serve(s, 3);
	});
	at(41.2 + SHIFT, (s) => {
		s.sheet = null;
	});
	at(41.6 + SHIFT, (s) => {
		g(s, 3).place = 'gone';
		g(s, 5).place = 'checkin';
	});
	at(42.1 + SHIFT, (s) => {
		s.tap = 'chip-5';
	});
	at(42.5 + SHIFT, (s) => {
		s.tap = null;
		s.sheet = 5;
		s.sheetMode = 'next';
		cap(
			'Steady flow',
			'Neighbor after neighbor, in line order.',
			'Guests wait where they’re comfortable until their number comes up.',
		)(s);
	});

	// The line finds its rhythm.
	t = 43.6 + SHIFT;

	for (let n = 5; n <= 16; n++) {
		const d = Math.max(0.8, 1.6 - (n - 5) * 0.11);
		const gap = Math.min(0.42, d * 0.32);
		const move = Math.min(0.75, d * 0.5);

		at(t, (s) => {
			s.tap = 'serveNext';
		});
		at(t + gap, (s) => {
			s.tap = null;
			serve(s, n);
			call(s, n + 1);
			s.sheet = n + 1;
			s.sheetMode = 'next';
		});
		at(
			t + gap + move,
			(s) => {
				g(s, n).place = 'gone';
				g(s, n + 1).place = 'checkin';
			},
			{ dur: Math.min(0.7, d * 0.6) },
		);
		t += d;
	}
	const outroAt = t + 1.2;

	at(outroAt, (s) => {
		s.phase = 'outro';
		s.kiosk = false;
		s.desk = false;
		s.cap = null;
		s.sheet = null;
		s.outro = true;
	});
	const END = outroAt + 6;

	const snaps = snapshots();

	/* ================= layout ================= */

	const PW = 380,
		PH = 780;
	const ROW = { x: 70, y: 778, step: 168, s: 0.38, visible: 8 };
	// GSAP scales around the centre; convert a desired top-left corner into that frame.
	const box = (X: number, Y: number, s: number, o = 1) => ({
		x: X - (PW / 2) * (1 - s),
		y: Y - (PH / 2) * (1 - s),
		scale: s,
		opacity: o,
	});

	function layoutOf(s: ReelState, x: ReelGuest): ReturnType<typeof box> {
		const cell = REG_ORDER.indexOf(x.n);
		const gridX = 203 + (cell % 11) * 140,
			gridY = 230 + Math.floor(cell / 11) * 264;

		if (s.phase === 'outro') {
			return x.place === 'gone' || x.place === 'dropped'
				? layoutOf({ ...s, phase: 'row' }, x)
				: { ...layoutOf({ ...s, phase: 'row' }, x), opacity: 0 };
		}

		switch (x.place) {
			case 'hidden':
				return x.n === SOLO ? box(1180, 150, 0.7, 0) : box(gridX, gridY, 0.04, 0);
			case 'dropped':
				return box(gridX, gridY + 30, 0.27, 0);
			case 'solo':
				return box(1180, 150, 1);
			case 'grid':
				return box(gridX, gridY, 0.3);
			case 'checkin':
				return box(1172, 236, 0.52);
			case 'gone':
				return box(1235, -520, 0.45, 0);

			case 'row': {
				const k = s.guests.filter((y) => y.place === 'row' && y.n < x.n).length;
				const slot = Math.min(k, ROW.visible);

				return box(ROW.x + slot * ROW.step, ROW.y, ROW.s, k < ROW.visible ? 1 : 0);
			}
		}
	}

	/* ================= views ================= */

	const phonesEl = k('phones');
	const phoneEls = PEOPLE.map((_, i) => phonesEl.appendChild(phoneFrame('10:4' + (i % 10))));

	function heroHtml(s: ReelState) {
		const L = S[s.heroLang];
		const dir = RTL.has(s.heroLang) ? 'rtl' : 'ltr';
		const pills = LANGS.map(
			([code, label]) =>
				'<span class="language-option' +
				(code === s.heroLang ? ' active' : '') +
				(s.tap === 'pill-' + code ? ' tapping' : '') +
				'">' +
				esc(label) +
				'</span>',
		).join('');

		return (
			'<div class="hero"><h1 dir="' +
			dir +
			'" lang="' +
			s.heroLang +
			'">' +
			esc(L.welcome) +
			'</h1>' +
			'<div class="language-selector"><p class="language-prompt" dir="' +
			dir +
			'">' +
			esc(L.languagePrompt) +
			'</p><div class="language-list">' +
			pills +
			'</div></div></div>'
		);
	}

	function formHtml(s: ReelState) {
		const L = S.en;
		const f = (key: Field, label: string) =>
			'<div class="field' +
			(s.focus === key ? ' focus' : '') +
			'"><label>' +
			esc(label) +
			' *</label><span>' +
			esc(s.typed[key]) +
			'</span></div>';

		return (
			'<div class="fieldset"><div class="legend">' +
			esc(L.info) +
			'</div>' +
			f('first', L.firstName) +
			f('last', L.lastName) +
			f('phone', L.phone) +
			'<div class="submit' +
			(s.tap === 'submit' ? ' tapping' : '') +
			'">' +
			esc(L.joinLottery) +
			'</div></div>'
		);
	}

	function guestHtml(s: ReelState, x: ReelGuest) {
		if (x.status === 'hidden') {
			return '';
		}
		const loc = x.status === 'hero' || x.status === 'form' ? 'en' : x.loc;
		let body;

		if (x.status === 'hero') {
			body = heroHtml(s) + formHtml(s);
		} else if (x.status === 'form') {
			body = formHtml(s);
		} else {
			body = statusHtml(s, x);
		}

		return guestApp(loc, body);
	}

	function renderPhones(s: ReelState) {
		s.guests.forEach((x, i) => renderGuestPhone(phoneEls[i]!, guestHtml(s, x), x.status));
	}

	/* desk */
	const deskEl = k('desk');
	const deskBody = k('deskBody');
	const sheetEl = k('sheet');
	const callNextEl = k('callNext');

	function chip(s: ReelState, x: ReelGuest) {
		return (
			'<li class="chip' +
			(s.tap === 'chip-' + x.n ? ' tapping' : '') +
			'" data-status="' +
			x.status +
			'"><span class="number">' +
			x.n +
			'</span><span class="name">' +
			esc(x.first + ' ' + x.last) +
			'</span><span class="lang">' +
			x.loc.toUpperCase() +
			'</span><span class="el">' +
			esc(x.elapsed) +
			'</span></li>'
		);
	}

	function section(title: string, list: ReelGuest[], s: ReelState, empty: string, action = '') {
		const items = list.length
			? '<ul>' + list.map((x) => chip(s, x)).join('') + '</ul>'
			: '<p class="empty">' + esc(empty) + '</p>';

		return (
			'<section class="tsection"><header><h2>' +
			title +
			' <span class="count">' +
			list.length +
			'</span></h2>' +
			action +
			'</header>' +
			items +
			'</section>'
		);
	}

	function renderDesk(s: ReelState) {
		const live = s.guests.filter((x) => x.place !== 'hidden');
		const called = live.filter((x) => x.status === 'called').sort((a, b) => a.n - b.n);
		const waiting = live.filter((x) => x.status === 'waiting');
		const done = live.filter((x) => x.status === 'served').reverse();

		put(
			deskBody,
			'<header class="dh"><div><h1>Queue</h1><p class="status">Serving guests</p></div><span class="kebab">⋮</span></header>' +
				section('Called', called, s, 'Nobody has been called yet.') +
				section(
					'Waiting',
					waiting.slice(0, 6),
					s,
					'Nobody is left in line.',
					'<span class="add">+ Add guest</span>',
				).replace(
					'<span class="count">' + Math.min(6, waiting.length) + '</span>',
					'<span class="count">' + waiting.length + '</span>',
				) +
				section('Done', done.slice(0, 4), s, 'Nobody has finished yet.').replace(
					'<span class="count">' + Math.min(4, done.length) + '</span>',
					'<span class="count">' + done.length + '</span>',
				),
		);
		callNextEl.classList.toggle('tapping', s.tap === 'callNext');

		if (s.tap === 'callNext' && !callNextEl.dataset.tapped) {
			callNextEl.classList.remove('tapping');
			void callNextEl.offsetWidth;
			callNextEl.classList.add('tapping');
		}
		callNextEl.dataset.tapped = s.tap === 'callNext' ? '1' : '';

		deskEl.classList.toggle('sheet-open', s.sheet !== null);

		if (s.sheet !== null) {
			const x = g(s, s.sheet);
			const served = x.status === 'served';
			const acts =
				s.sheetMode === 'served' || served
					? '<span class="primary' +
						(s.tap === 'markServed' ? ' tapping' : '') +
						'">Mark served</span><span>Phone</span>'
					: '<span class="primary' +
						(s.tap === 'serveNext' ? ' tapping' : '') +
						'">Serve and call next</span><span>Mark served</span><span>Phone</span>';
			const tagName = x.first + ' ' + x.last.charAt(0) + '.';

			put(
				sheetEl,
				'<span class="handle"></span>' +
					'<section class="summary"><div class="ticket"><p class="label">Ticket</p><p class="num">' +
					x.n +
					'</p></div><p class="st' +
					(served ? ' served' : '') +
					'"><span>' +
					(served ? 'Served' : 'Called') +
					'</span>' +
					(served ? '' : esc(x.elapsed === 'now' ? '0:08' : x.elapsed.replace('m', ':12'))) +
					'</p></section>' +
					'<p class="gdetails"><span>' +
					esc(x.first + ' ' + x.last) +
					'</span><span>' +
					ENGLISH[x.loc] +
					'</span></p>' +
					'<figure class="nametag"><figcaption>Name tag</figcaption><p class="nm">' +
					esc(tagName) +
					'</p><p class="dt"><span class="pos">#' +
					x.n +
					'</span><span class="lg">' +
					x.loc.toUpperCase() +
					'</span></p></figure>' +
					'<div class="printbtn">Print name tag</div>' +
					'<div class="actions">' +
					acts +
					'</div>',
			);
		}
	}

	const stage = k('stage');
	let lastIndex = -1;

	function renderAt(time: number) {
		const i = snapshotAt(snaps, time);
		const s = snaps[i]!.s;

		if (i !== lastIndex) {
			lastIndex = i;
			stage.dataset.phase = s.phase;
			renderPhones(s);
			renderDesk(s);
			renderCaption(s);
		}
		// The room display's second language moves on every few seconds once it is on screen.
		renderKiosk(s, Math.max(0, Math.floor((time - 19.4 - SHIFT) / 3.4)));
	}

	/* ================= timeline ================= */

	const tl = gsap.timeline({
		id: 'Market Day Reel',
		paused: true,
		onUpdate: () => renderAt(tl.time()),
	});

	// Title card.
	tl.fromTo(
		'#title .wordmark',
		{ opacity: 0, y: 30, scale: 0.94 },
		{ opacity: 1, y: 0, scale: 1, duration: 1.1, ease: 'power3.out', immediateRender: false },
		0.2,
	);
	tl.fromTo(
		'#title .line',
		{ opacity: 0, y: 24 },
		{ opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', immediateRender: false },
		0.9,
	);
	tl.to('#title', { opacity: 0, scale: 1.04, duration: 0.6, ease: 'power2.in' }, 3.3);

	// Phones follow their place in the state, beat by beat.
	const first = snaps[0]!.s;

	phoneEls.forEach((el, i) => gsap.set(el, layoutOf(first, first.guests[i]!)));

	for (let b = 1; b < snaps.length; b++) {
		const snap = snaps[b]!,
			prev = snaps[b - 1]!.s,
			cur = snap.s;

		cur.guests.forEach((x, i) => {
			const was = prev.guests[i]!;
			const a = layoutOf(prev, was);
			const z = layoutOf(cur, x);

			if (a.x === z.x && a.y === z.y && a.scale === z.scale && a.opacity === z.opacity) {
				return;
			}
			const from = was.place,
				to = x.place;
			let duration = snap.opts.dur ?? 0.85,
				ease = 'power3.inOut',
				delay = 0;

			if (from === 'hidden') {
				duration = 0.6;
				ease = 'back.out(1.9)';
				delay = to === 'grid' ? REG_ORDER.indexOf(x.n) * 0.055 : 0;
			} else if (to === 'gone') {
				duration = Math.min(duration, 0.8);
				ease = 'power2.in';
			} else if (to === 'dropped') {
				duration = 1.2;
				ease = 'power2.inOut';
			} else if (from === 'grid' && to === 'row') {
				duration = 1.1;
				delay = (29 - i) * 0.018;
			}

			if (cur.phase === 'outro') {
				duration = 0.8;
				delay = 0;
				ease = 'power2.inOut';
			}
			tl.fromTo(phoneEls[i]!, a, { ...z, duration, ease, immediateRender: false }, snap.t + delay);
		});

		if (prev.kiosk !== cur.kiosk) {
			tl.fromTo(
				'#kiosk',
				{ x: cur.kiosk ? -260 : 0, opacity: cur.kiosk ? 0 : 1 },
				{
					x: cur.kiosk ? 0 : -60,
					opacity: cur.kiosk ? 1 : 0,
					duration: 1.1,
					ease: 'power3.out',
					immediateRender: false,
				},
				snap.t + (cur.kiosk ? 0.35 : 0),
			);
			tl.fromTo(
				'#zKiosk',
				{ opacity: cur.kiosk ? 0 : 1 },
				{ opacity: cur.kiosk ? 1 : 0, duration: 0.6, immediateRender: false },
				snap.t + (cur.kiosk ? 1.2 : 0),
			);
		}

		if (prev.desk !== cur.desk) {
			gsap.set('#desk', { x: 1490, y: 140, scale: 0.98, transformOrigin: '0 0' });
			tl.fromTo(
				'#desk',
				{ x: cur.desk ? 1990 : 1490, opacity: cur.desk ? 0 : 1 },
				{
					x: cur.desk ? 1490 : 1560,
					opacity: cur.desk ? 1 : 0,
					duration: 1.1,
					ease: 'power3.out',
					immediateRender: false,
				},
				snap.t + (cur.desk ? 0.55 : 0),
			);
			tl.fromTo(
				'#zDesk',
				{ opacity: cur.desk ? 0 : 1 },
				{ opacity: cur.desk ? 1 : 0, duration: 0.6, immediateRender: false },
				snap.t + (cur.desk ? 1.4 : 0),
			);
		}

		if (!prev.outro && cur.outro) {
			tl.fromTo(
				'#outro',
				{ opacity: 0, scale: 0.96 },
				{ opacity: 1, scale: 1, duration: 1.2, ease: 'power3.out', immediateRender: false },
				snap.t + 0.7,
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
				snap.t + 1.6,
			);
		}
	}

	window.stage.mountPlayer({ tl, END, snaps, describeBeat, source: 'market-day-reel/page.ts' });

	function describeBeat(prev: ReelState, cur: ReelState) {
		const items: string[] = [];
		let minor: string | null = null;
		const toggle = (key: 'title' | 'kiosk' | 'desk', on: string, off: string) =>
			prev[key] !== cur[key] && items.push(cur[key] ? on : off);

		if (prev.phase !== cur.phase) {
			items.push('Scene: ' + cur.phase);
		}
		toggle('title', 'Title card in', 'Title card out');
		toggle('kiosk', 'Room display in', 'Room display out');
		toggle('desk', 'Queue desk in', 'Queue desk out');

		if (!prev.outro && cur.outro) {
			items.push('Closing card');
		}

		if (cur.cap && prev.cap?.head !== cur.cap.head) {
			items.push('Caption: “' + cur.cap.head + '”');
		}

		if (prev.nowCalling !== cur.nowCalling && cur.nowCalling !== null) {
			items.push('Calls #' + cur.nowCalling);
		}

		if (prev.tap !== cur.tap && cur.tap) {
			items.push('Tap: ' + cur.tap);
		}

		if (prev.sheet !== cur.sheet) {
			items.push(cur.sheet === null ? 'Ticket closes' : 'Ticket #' + cur.sheet + ' opens');
		}

		if (prev.heroLang !== cur.heroLang) {
			items.push('Welcome card in ' + cur.heroLang);
		}
		const statuses: [number, string | null, string][] = [],
			places: [number, string][] = [];

		cur.guests.forEach((x, i) => {
			const was = prev.guests[i]!;

			if (was.status !== x.status) {
				statuses.push([x.n, was.status, x.status]);
			}

			if (was.place !== x.place) {
				places.push([x.n, x.place]);
			}

			if (was.warmth !== x.warmth) {
				items.push('#' + x.n + ' board warms to ' + x.warmth);
			}
		});

		const group = (list: [number, string | null, string][], word: string) => {
			if (list.length > 3) {
				const counts: Record<string, number> = {};

				list.forEach(([, , to]) => (counts[to] = (counts[to] ?? 0) + 1));
				Object.entries(counts).forEach(([to, n]) => items.push(n + ' guests ' + word + ' ' + to));
			} else {
				list.forEach(([n, , to]) => items.push('#' + n + ' ' + word + ' ' + to));
			}
		};
		const onlyReveal =
			statuses.length === 1 && statuses[0]![1] === 'registered' && !places.length && !items.length;

		if (onlyReveal) {
			minor = 'Draw reveals';
		} else {
			group(statuses, '→');
		}
		group(
			places.map(([n, to]) => [n, null, to]),
			'to',
		);

		if (!items.length && !minor) {
			if (prev.clock !== cur.clock) {
				minor = 'Countdown ticks';
			} else if (
				prev.focus !== cur.focus ||
				JSON.stringify(prev.typed) !== JSON.stringify(cur.typed)
			) {
				minor = 'Typing';
			}
		}

		return { items, minor };
	}
});
