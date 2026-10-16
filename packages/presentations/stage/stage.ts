/**
 * Shared by every video: the helpers a beat script is written with, the guest phone and room
 * display views, captions, and the player — controls, soundtrack, `#record` for capture, and `#dev`
 * for editing.
 *
 * The build strips this file's types without moving a line, wraps it in a function so its names
 * stay its own, and inlines it after the page's own script. A page therefore waits for
 * `DOMContentLoaded` and then reads everything it needs from `window.stage`. The build also fills
 * in the guest copy from `src/locales.ts`, the logo, and the page's own soundtrack.
 */
import type { Locale } from '../../../src/locales.ts';
import type { DeskStrings, StageStrings } from '../strings.ts';
import type { Chapter, Cue, Reel, TimedLine } from './reel.ts';

declare const __STRINGS__: StageStrings;
/** The queue desk's copy, from `src/adminLocales.ts`. Staff screens are English only. */
declare const __DESK__: DeskStrings;

const S = __STRINGS__;
const DESK = __DESK__;
const LOGO = '__LOGO__';
const SOUNDTRACK = '__SOUNDTRACK__';
/** A narrated video's voice alone, for playing it without the music; empty for the reel. */
const VOICE_TRACK = '__VOICE_TRACK__';
const LANGS: [Locale, string][] = [
	['en', 'English'],
	['es', 'Español'],
	['tl', 'Tagalog'],
	['zh', '中文'],
	['fa', 'فارسی'],
	['ar', 'العربية'],
	['vi', 'Tiếng Việt'],
	['fr', 'Français'],
];
const ENGLISH: Record<Locale, string> = {
	en: 'English',
	es: 'Spanish',
	tl: 'Tagalog',
	zh: 'Chinese',
	fa: 'Farsi',
	ar: 'Arabic',
	vi: 'Vietnamese',
	fr: 'French',
};
const KIOSK_ROTATION: Locale[] = ['es', 'tl', 'zh', 'fa', 'ar', 'vi', 'fr'];
const RTL = new Set<Locale>(['fa', 'ar']);
const DIGITS: Partial<Record<Locale, string>> = { fa: '۰۱۲۳۴۵۶۷۸۹', ar: '٠١٢٣٤٥٦٧٨٩' };
const nativeOf = (loc: Locale, n: number | string) => {
	const digits = DIGITS[loc];

	return digits ? String(n).replace(/\d/g, (d) => digits[Number(d)] ?? d) : String(n);
};
const esc = (v: unknown) =>
	String(v).replace(
		/[&<>"]/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c,
	);

/** A guest as the stage draws them: on a phone, on the room display, or in the desk's line. */
export interface StageGuest {
	n: number;
	/** The number as shown when it isn't `n`: `P1` for one a volunteer put at the front. */
	label?: string;
	first: string;
	last: string;
	loc: Locale;
	status: string;
	/** Where the room display counts them from; `hidden` keeps them off it. */
	place?: string;
	/** How far a called guest's board has warmed toward yellow, `0`–`1`. */
	warmth: number;
}

/** The part of a page's state the guest phone and room display read. */
export interface LineState {
	guests: StageGuest[];
	nowCalling: number | null;
	registrationClosed?: boolean;
	/** Seconds left to register. */
	clock?: number;
}

export interface Caption {
	eyebrow: string;
	head: string;
	sub: string;
}

/** A guest's number as shown: `12`, or `P1` for one a volunteer put at the front. */
const label = (x: Pick<StageGuest, 'n' | 'label'>) => x.label ?? String(x.n);

/** The element with this id, which the page's markup always has. */
function k(id: string): HTMLElement {
	const el = document.getElementById(id);

	if (!el) {
		throw new Error(`No #${id} on the stage`);
	}

	return el;
}

/** The first element a selector matches inside `root`, which the stage's own markup always has. */
function one<E extends Element = HTMLElement>(root: ParentNode, selector: string): E {
	const el = root.querySelector<E>(selector);

	if (!el) {
		throw new Error(`No ${selector} on the stage`);
	}

	return el;
}

/* ================= beat script ================= */

export interface BeatOptions {
	/** How many helper calls sit between the beat and the line #dev should name. */
	via?: number;
	/** How long a page's own transition for this beat runs. */
	dur?: number;
}

export interface Snapshot<State> {
	t: number;
	s: State;
	opts: { line?: number | null; dur?: number };
}

/**
 * A list of beats, each changing a copy of the state at a moment, and the snapshot of the state
 * after every one of them. `at` notes the source line that scheduled a beat, for the #dev list.
 */
function beatScript<State>(initial: State) {
	const script: { t: number; fn: (s: State) => void; opts: Snapshot<State>['opts'] }[] = [];
	// A helper that schedules beats for its caller passes `via: 1`, so the line noted is the
	// caller's rather than the helper's own.
	const at = (t: number, fn: (s: State) => void, { via = 0, ...opts }: BeatOptions = {}) => {
		const frames = (new Error().stack ?? '')
			.split('\n')
			.filter((frame) => /:\d+:\d+\)?$/.test(frame));
		const line = Number(frames[1 + via]?.match(/:(\d+):\d+\)?$/)?.[1]) || null;

		script.push({ t, fn, opts: { ...opts, line } });
	};
	const snapshots = () => {
		script.sort((a, b) => a.t - b.t);
		const snaps: Snapshot<State>[] = [{ t: 0, s: structuredClone(initial), opts: {} }];

		for (const beat of script) {
			const s = structuredClone(snaps[snaps.length - 1]!.s);

			beat.fn(s);
			snaps.push({ t: beat.t, s, opts: beat.opts });
		}

		return snaps;
	};

	return { at, snapshots };
}

/** The index of the last snapshot at or before `time`. */
function snapshotAt<State>(snaps: Snapshot<State>[], time: number): number {
	let i = 0;

	while (i + 1 < snaps.length && snaps[i + 1]!.t <= time) {
		i++;
	}

	return i;
}

/**
 * Recorded line lengths pace both animation beats and the music arrangement. A line marked with
 * a `chapter` starts one: `chapters` lists each, from where its line starts (the first from 0,
 * so it includes the title card).
 */
function narrationCues(lines: TimedLine[]) {
	const cues = new Map<string, Cue>();
	const chapters: Chapter[] = [];
	let clock = 0;

	for (const line of lines) {
		clock += line.pause;
		cues.set(line.id, { ...line, t: clock });

		if (line.chapter) {
			chapters.push({
				key: line.chapter,
				t: chapters.length ? clock : 0,
			});
		}
		clock += line.duration;
	}

	const C = (id: string, fraction = 0) => {
		const cue = cues.get(id);

		if (!cue) {
			throw new Error('No narration line "' + id + '"');
		}

		return cue.t + fraction * cue.duration;
	};

	return { cues, chapters, C, E: (id: string, plus = 0) => C(id, 1) + plus };
}

const cap =
	(eyebrow: string, head: string, sub: string) =>
	(s: { cap: Caption | null }): void => {
		s.cap = { eyebrow, head, sub };
	};

/** Replaces an element's markup only when it changed, so CSS animations aren't restarted. */
const lastHtml = new Map<unknown, string>();

function put(el: Element, html: string, key: unknown = el): boolean {
	if (lastHtml.get(key) === html) {
		return false;
	}
	lastHtml.set(key, html);
	el.innerHTML = html;

	return true;
}

/* ================= guest phone ================= */

const helpIcon =
	'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14" stroke-linecap="round"/><path d="M12 17h.01" stroke-linecap="round"/></svg>';
const translateIcon =
	'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.9 15.1 10.4 12.6l.03-.03A17.5 17.5 0 0 0 14.1 6H17V4h-7V2H8v2H1v2h11.2A15.8 15.8 0 0 1 9 11.4 15.6 15.6 0 0 1 6.7 8H4.7c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.02ZM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12Zm-2.62 7 1.62-4.33L19.12 17h-3.24Z"/></svg>';
const warnIcon =
	'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3 2 20h20L12 3Z" stroke-linejoin="round"/><path d="M12 10v4M12 17h.01" stroke-linecap="round"/></svg>';
const appBar = (loc: Locale) =>
	'<div class="topbar"><span class="brand"><img alt="" src="' +
	LOGO +
	'"><span>' +
	esc(S[loc].marketName || 'The Bay Compassion') +
	'</span></span><span class="acts">' +
	helpIcon +
	translateIcon +
	'</span></div>';

/** The guest's visit card, in their language: registered, waiting, called, served, not placed. */
function statusHtml(s: LineState, x: StageGuest): string {
	const L = S[x.loc];
	let mark = '✓',
		tone = '',
		head = L.waiting,
		det = L.waitingDetails,
		board = true;

	if (x.status === 'called') {
		mark = '→';
		tone = ' action';
		head = L.called;
		det = x.warmth >= 1 ? L.late : L.calledDetails;
	}

	if (x.status === 'served') {
		tone = ' action';
		head = L.served;
		det = L.servedDetails;
		board = false;
	}

	if (x.status === 'not_placed') {
		mark = '—';
		tone = ' muted';
		head = L.notPlaced;
		det = L.notPlacedDetails;
		board = false;
	}

	if (x.status === 'no_show') {
		mark = '!';
		tone = ' warning';
		head = L.noShow;
		det = L.noShowDetails;
		board = false;
	}

	if (x.status === 'registered') {
		head = L.registered;
		det = L.registeredDetails;
		board = false;
	}
	let html =
		'<div class="panel"><div class="mark' +
		tone +
		'">' +
		mark +
		'</div><h2>' +
		esc(head) +
		'</h2><p>' +
		esc(det) +
		'</p>';

	if (x.status === 'registered' && !s.registrationClosed) {
		const seconds = s.clock ?? 0;
		// Warms toward the error colour over the last five minutes, as RegistrationCountdown does.
		const progress = Math.min(1, Math.max(0, 1 - seconds / 300));
		const clock =
			String(Math.floor(seconds / 60)).padStart(2, '0') +
			':' +
			String(seconds % 60).padStart(2, '0');

		html +=
			'<div class="countdown" style="--progress:' +
			progress +
			'"><span>' +
			esc(L.closesIn) +
			'</span><strong>' +
			clock +
			'</strong></div>';
	}

	if (board) {
		const earlier = s.guests
			.filter((y) => y.status === 'called' && y.n !== s.nowCalling)
			.map(label);
		const calling =
			s.nowCalling === null
				? '<div class="none">' + esc(L.none) + '</div>'
				: '<div class="tiles"><span class="tile latest">' +
					label(s.guests[s.nowCalling - 1]!) +
					'</span>' +
					earlier.map((n) => '<span class="tile earlier">' + n + '</span>').join('') +
					'</div>';
		const warmth = x.status === 'called' ? x.warmth : 0;
		const toneColor = x.status === 'called' ? 'var(--color-success)' : 'var(--color-brand-dark)';

		html +=
			'<div class="stamp" dir="ltr"><span class="live"></span><span><strong>' +
			esc(x.first + ' ' + x.last) +
			'</strong><small>10/10/2026</small></span></div>' +
			'<div class="standing"><div class="board' +
			(warmth >= 0.28 ? ' dark-text' : '') +
			'" style="--tone:' +
			toneColor +
			';--warmth:' +
			warmth +
			'"><span>' +
			(warmth > 0 ? warnIcon : '') +
			esc(L.yourNumber) +
			'</span><strong>' +
			label(x) +
			'</strong></div>' +
			'<div class="nowcalling"><span>' +
			esc(L.nowCallingLabel) +
			'</span>' +
			calling +
			'</div></div>';
	}

	return html + '</div>';
}

/** A guest phone's app, in the guest's language and writing direction, around a page body. */
function guestApp(loc: Locale, body: string): string {
	return (
		'<div dir="' +
		(RTL.has(loc) ? 'rtl' : 'ltr') +
		'" lang="' +
		loc +
		'">' +
		appBar(loc) +
		'<div class="guest-layout">' +
		body +
		'</div></div>'
	);
}

/** An empty phone frame; its `.app` is where a page draws the screen. */
function phoneFrame(time: string): HTMLDivElement {
	const el = document.createElement('div');

	el.className = 'phone';
	el.innerHTML =
		'<div class="screen"><div class="statusbar"><span>' +
		time +
		'</span><i><s></s><b></b></i></div><div class="app"></div></div>';

	return el;
}

/** Draws a guest's screen, replaying the swap and "called" animations when their status moves. */
function renderGuestPhone(el: HTMLElement, html: string, status: string): void {
	const app = one(el, '.app');
	const prevStatus = el.dataset.status;

	if (put(app, html) && prevStatus && prevStatus !== status) {
		app.classList.remove('swap');
		void app.offsetWidth;
		app.classList.add('swap');
	}

	if (status === 'called' && prevStatus !== 'called') {
		el.classList.remove('is-called');
		void el.offsetWidth;
		el.classList.add('is-called');
	}

	if (status !== 'called') {
		el.classList.remove('is-called');
	}
	el.dataset.status = status;
}

/* ================= room display ================= */

const KIOSK =
	'<div class="kscreen"><div class="kheader"><div><span id="kMarket"></span></div>' +
	'<div><span id="kCount"></span><span class="k2" id="kCount2"></span></div></div>' +
	'<div class="klayout"><section class="know">' +
	'<h1><span>Now calling</span><span class="k2" id="kNow2"></span></h1><div id="kNum"></div></section>' +
	'<section class="kpanel"><h2><span>Already Called</span><span class="k2" id="kStill2"></span></h2>' +
	'<ul id="kStill"></ul></section></div><div class="kfooter" id="kFoot"></div></div>';
let lastKioskNum: string | null = null;

/** The `/kiosk` board: numbers only, English beside a second language that rotates every few seconds. */
function renderKiosk(s: LineState, idx: number): void {
	if (!k('kiosk').firstElementChild) {
		k('kiosk').innerHTML = KIOSK;
		k('kMarket').textContent = S.en.marketName || 'The Bay Compassion';
	}
	const loc = KIOSK_ROTATION[idx % KIOSK_ROTATION.length]!;
	const K = S[loc].kiosk;
	const waiting = s.guests.filter((x) => x.status === 'waiting' && x.place !== 'hidden').length;
	const dir = RTL.has(loc) ? 'rtl' : 'auto';

	put(k('kCount'), esc(S.en.kiosk.waitingCount.replace('{count}', String(waiting))));

	const second = (el: HTMLElement, text: string) => {
		if (put(el, esc(text))) {
			el.setAttribute('lang', loc);
			el.setAttribute('dir', dir);
			el.style.animation = 'none';
			void el.offsetWidth;
			el.style.animation = '';
		}
	};

	second(k('kCount2'), K.waitingCount.replace('{count}', nativeOf(loc, waiting)));
	second(k('kNow2'), K.nowCalling);
	second(k('kStill2'), K.still);

	const numWrap = k('kNum');

	if (s.nowCalling === null) {
		put(
			numWrap,
			'<p>No numbers called yet<span class="k2" lang="' + loc + '" dir="' + dir + '"></span></p>',
		);
		lastKioskNum = null;
	} else {
		const now = label(s.guests[s.nowCalling - 1]!);

		if (lastKioskNum !== now) {
			numWrap.innerHTML =
				'<strong class="knum"><span>' + now + '</span><span class="nd"></span></strong>';
			lastHtml.delete(numWrap);
			lastKioskNum = now;
		}
		const strong = one(numWrap, '.knum');
		const nd = one(numWrap, '.nd');
		const hasNative = Boolean(DIGITS[loc]);

		strong.classList.toggle('native', hasNative);
		const native = hasNative ? nativeOf(loc, now) : '';

		if (nd.textContent !== native) {
			nd.textContent = native;
			nd.setAttribute('lang', loc);
		}
		nd.hidden = !hasNative;
	}
	const earlier = s.guests.filter((x) => x.status === 'called' && x.n !== s.nowCalling).map(label);

	put(
		k('kStill'),
		earlier
			.map(
				(n) =>
					'<li><span>' +
					n +
					'</span>' +
					(DIGITS[loc] ? '<span lang="' + loc + '">' + nativeOf(loc, n) + '</span>' : '') +
					'</li>',
			)
			.join(''),
	);
	put(
		k('kFoot'),
		KIOSK_ROTATION.map(
			(_code, i) => '<i class="' + (i === idx % KIOSK_ROTATION.length ? 'on' : '') + '"></i>',
		).join('') +
			'<span>English · ' +
			esc(LANGS.find(([c]) => c === loc)?.[1]) +
			'</span>',
	);
}

/* ================= captions ================= */

function renderCaption(s: { cap: Caption | null }): void {
	const c = s.cap;

	put(
		k('cap'),
		c
			? '<div class="inner"><div class="eyebrow">' +
					esc(c.eyebrow) +
					'</div><div class="head">' +
					esc(c.head) +
					'</div><div class="sub">' +
					esc(c.sub) +
					'</div></div>'
			: '',
	);
}

/* ================= player ================= */

/** The player's button symbols, drawn in the button's text colour. */
const ICONS = {
	play: '<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>',
	pause: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" stroke="none"/>',
	restart: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
	soundOn:
		'<path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
	soundOff: '<path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor"/><path d="m22 9-6 6M16 9l6 6"/>',
	musicOn:
		'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
	musicOff:
		'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="m2 2 20 20"/>',
	previous: '<path d="M19 20 9 12l10-8z" fill="currentColor"/><path d="M5 19V5"/>',
	next: '<path d="m5 4 10 8-10 8z" fill="currentColor"/><path d="M19 5v14"/>',
	steps: '<path d="M3 20h5v-5h5v-5h5V5h3"/>',
};

/** Shows `icon` on a symbol-only button, named for assistive technology and in its tooltip. */
function setIcon(button: HTMLElement, icon: keyof typeof ICONS, name: string, hint = name) {
	if (button.dataset.icon !== icon) {
		button.dataset.icon = icon;
		button.innerHTML =
			'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
			ICONS[icon] +
			'</svg>';
	}
	button.setAttribute('aria-label', name);
	button.title = hint;
}

/** How far the arrow keys move the playhead, in seconds. */
const SKIP = 10;

export interface BeatDescription {
	items: string[];
	minor: string | null;
}

export interface PlayerOptions<State> {
	tl: gsap.core.Timeline;
	END: number;
	snaps: Snapshot<State>[];
	describeBeat: (prev: State, cur: State) => BeatDescription;
	/** The page's script, which the #dev beat list's line numbers refer to. */
	source: string;
	cues?: Cue[];
	chapters?: Chapter[];
	chapterTitle?: (key: string, locale: Locale) => string;
	onLocaleChange?: (locale: Locale) => void;
	/** Resolves once everything the page needs before it plays — beyond its fonts — has loaded. */
	ready?: Promise<void>;
	/** Resolves once the page shows the playhead's moment, fully drawn (see `Reel.settle`). */
	settle?: () => Promise<void>;
}

interface DevRow {
	t: number;
	line: number | null | undefined;
	text: string;
	minor?: string;
	count?: number;
	end?: number;
}

/**
 * Plays a page's timeline with controls and its soundtrack, and exposes it as `window.reel` for
 * the capture and still scripts. `#record` hides the controls and waits to be driven; `#dev` adds
 * GSAP's scrubber and the beat list, which `describeBeat(prev, cur)` writes from the snapshots.
 * `chapters` (from `narrationCues`) adds a chapter list with previous and next buttons, each
 * named by `chapterTitle(key, locale)`, and a step-by-step mode that pauses as each one ends.
 * Space plays and pauses, and the arrow keys skip ten seconds back or ahead.
 */
function mountPlayer<State>({
	tl,
	END,
	snaps,
	describeBeat,
	source,
	cues = [],
	chapters = [],
	chapterTitle = (key) => key,
	onLocaleChange,
	ready = Promise.resolve(),
	settle = () => Promise.resolve(),
}: PlayerOptions<State>): void {
	const viewport = k('viewport');
	const stage = k('stage');
	let locale: Locale = 'en';
	let soundAvailable = true;
	const copy = () =>
		onLocaleChange
			? S[locale].guide.presentation
			: {
					play: 'Play',
					pause: 'Pause',
					restart: 'Restart',
					soundOn: 'Sound on',
					soundOff: 'Sound off',
					noSound: 'No sound',
					musicOn: 'Music on',
					musicOff: 'Music off',
					volume: 'Volume',
					seek: 'Seek',
					chapter: 'Chapter',
					previousChapter: 'Previous chapter',
					nextChapter: 'Next chapter',
					stepByStep: 'Step by step',
					stepByStepHint: 'Pause at the end of each chapter',
				};

	viewport.insertAdjacentHTML(
		'afterend',
		'<div id="controls">' +
			'<button type="button" class="icon" id="play"></button>' +
			'<button type="button" class="icon" id="restart"></button>' +
			'<div id="soundGroup"><button type="button" class="icon" id="sound" aria-pressed="false"></button>' +
			'<input type="range" id="volume" min="0" max="100" value="100" /></div>' +
			(VOICE_TRACK
				? '<button type="button" class="icon" id="music" aria-pressed="true"></button>'
				: '') +
			'<input type="range" id="scrub" min="0" max="1000" value="0" aria-label="Seek" />' +
			'<span id="clock">0:00</span></div>',
	);

	if (chapters.length) {
		k('controls').insertAdjacentHTML(
			'beforeend',
			'<div id="chapters">' +
				'<button type="button" class="icon" id="prevChapter"></button>' +
				'<select id="chapter"></select>' +
				'<button type="button" class="icon" id="nextChapter"></button></div>' +
				'<button type="button" class="icon" id="stepMode" aria-pressed="false"></button>',
		);
	}

	if (onLocaleChange) {
		k('controls').insertAdjacentHTML(
			'beforeend',
			'<select id="presentationLocale">' +
				LANGS.map(([code, name]) => '<option value="' + code + '">' + esc(name) + '</option>').join(
					'',
				) +
				'</select>',
		);
		k('presentationLocale').addEventListener('change', (event) => {
			locale = (event.target as HTMLSelectElement).value as Locale;
			document.documentElement.lang = locale;
			onLocaleChange(locale);
			syncControls();
		});
	}
	k('controls').insertAdjacentHTML(
		'beforeend',
		'<button type="button" id="devOpen" title="Scrubber and beat list for editing the video">Dev</button>',
	);
	let devTick: (() => void) | null = null;
	const render = tl.eventCallback('onUpdate') as () => void;

	tl.eventCallback('onUpdate', () => {
		holdAtChapterEnd();
		render();
		syncControls();
		syncAudio();
		devTick?.();
	});
	tl.set({}, {}, END);

	/** An embedded track as a URL a media element can play, once it has read the track's length. */
	const load = (base64: string) => {
		const url = URL.createObjectURL(
			new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], { type: 'audio/mp4' }),
		);
		const probe = new Audio();

		return new Promise<HTMLAudioElement>((resolve, reject) => {
			probe.preload = 'metadata';
			probe.addEventListener('loadedmetadata', () => resolve(probe), { once: true });
			probe.addEventListener('error', reject, { once: true });
			probe.src = url;
		});
	};
	let soundtrack: string | null = null;
	const soundtrackReady = load(SOUNDTRACK)
		.then((track) => ((soundtrack = track.src), track))
		.catch(() => {
			// A browser without AAC playback plays the video silently rather than offering dead sound.
			soundAvailable = false;
			syncControls();
		});
	/** The voice alone, loaded the first time the viewer turns the music off. */
	let voiceTrack: string | null = null;
	let voiceTrackReady: Promise<HTMLAudioElement | null> | null = null;
	const loadVoiceTrack = () =>
		(voiceTrackReady ??= VOICE_TRACK
			? load(VOICE_TRACK).then((track) => ((voiceTrack = track.src), track))
			: Promise.resolve(null));

	const fit = () => {
		stage.style.transform =
			'scale(' + viewport.clientWidth / parseFloat(getComputedStyle(stage).width) + ')';
	};

	new ResizeObserver(fit).observe(viewport);
	fit();

	const playBtn = k('play');
	const soundBtn = k('sound') as HTMLButtonElement;
	const musicBtn = document.getElementById('music') as HTMLButtonElement | null;
	const volume = k('volume') as HTMLInputElement;
	const scrub = k('scrub') as HTMLInputElement;
	let soundOn = false;
	let musicOn = true;
	const clock = k('clock');
	const fmt = (sec: number) =>
		Math.floor(sec / 60) + ':' + String(Math.floor(sec % 60)).padStart(2, '0');

	function syncControls() {
		document.body.classList.toggle(
			'watch-title',
			document.body.classList.contains('watch') && tl.paused() && tl.time() === 0,
		);
		scrub.value = String(Math.round((tl.time() / END) * 1000));
		clock.textContent = fmt(tl.time());
		const L = copy();
		const stopped = tl.paused() || tl.progress() === 1;

		setIcon(playBtn, stopped ? 'play' : 'pause', stopped ? L.play : L.pause);
		setIcon(k('restart'), 'restart', L.restart);
		setIcon(
			soundBtn,
			soundOn && soundAvailable ? 'soundOn' : 'soundOff',
			soundAvailable ? (soundOn ? L.soundOn : L.soundOff) : L.noSound,
		);
		soundBtn.setAttribute('aria-pressed', String(soundOn));
		soundBtn.disabled = !soundAvailable;
		volume.disabled = !soundAvailable;
		volume.setAttribute('aria-label', L.volume);
		volume.title = L.volume;

		if (musicBtn) {
			setIcon(musicBtn, musicOn ? 'musicOn' : 'musicOff', musicOn ? L.musicOn : L.musicOff);
			musicBtn.setAttribute('aria-pressed', String(musicOn));
			musicBtn.disabled = !soundAvailable;
		}
		scrub.setAttribute('aria-label', L.seek);

		if (onLocaleChange) {
			k('presentationLocale').setAttribute('aria-label', S[locale].guide.language);
		}
		syncChapters(L);
	}

	/* ---------- chapters ---------- */

	/** The chapter the playhead is in. */
	const chapterAt = (time: number) => chapters.findLastIndex((chapter) => chapter.t <= time + 0.01);
	let chapterLocale: Locale | null = null;

	function syncChapters(L: ReturnType<typeof copy>) {
		if (!chapters.length) {
			return;
		}
		const select = k('chapter') as HTMLSelectElement;

		if (chapterLocale !== locale) {
			chapterLocale = locale;
			select.innerHTML = chapters
				.map(
					(chapter, i) =>
						'<option value="' +
						i +
						'">' +
						esc(i + 1 + '. ' + chapterTitle(chapter.key, locale)) +
						'</option>',
				)
				.join('');
			select.setAttribute('aria-label', L.chapter);
			setIcon(k('prevChapter'), 'previous', L.previousChapter);
			setIcon(k('nextChapter'), 'next', L.nextChapter);
		}
		const current = chapterAt(tl.time());

		select.value = String(current);
		(k('prevChapter') as HTMLButtonElement).disabled = tl.time() < 0.05;
		(k('nextChapter') as HTMLButtonElement).disabled = current === chapters.length - 1;
		setIcon(k('stepMode'), 'steps', L.stepByStep, L.stepByStep + ' — ' + L.stepByStepHint);
		k('stepMode').setAttribute('aria-pressed', String(stepByStep));
	}

	/*
	 * Step by step: playing into the next chapter pauses just before its first beat, holding the
	 * finished step on screen (its last line has ended by then) until the viewer plays on. The
	 * hold lands before the boundary, so playing on crosses it without stopping again.
	 */
	const HOLD = 0.05;
	/**
	 * Where a chapter's hold lands, to the millisecond GSAP keeps time in: a boundary such as
	 * 46.126000000000005 would otherwise hold at 46.076, which still reads as before it, and playing
	 * on would hold there again.
	 */
	const holdBefore = (t: number) => Math.round((t - HOLD) * 1000) / 1000;
	let stepByStep = false;
	let lastTime = 0;

	function holdAtChapterEnd() {
		const now = tl.time();
		const next =
			stepByStep && !tl.paused()
				? chapters.find(
						(chapter) =>
							chapter.t > 0 && lastTime < holdBefore(chapter.t) && now >= holdBefore(chapter.t),
					)
				: null;

		if (next) {
			tl.pause(holdBefore(next.t));
		}
		lastTime = tl.time();
	}

	/**
	 * Jumps to `time` and carries on as it was: playing on with the sound in step, or paused. The
	 * jump is made paused, so a step-by-step hold it crosses doesn't stop playback at once.
	 */
	function seekTo(time: number) {
		const playing = !tl.paused() && tl.progress() < 1;

		pendingRestart?.kill();
		tl.pause();
		tl.time(Math.max(0, Math.min(END, time)));

		if (playing && tl.progress() < 1) {
			tl.play();
		}
		syncControls();

		if (!tl.paused()) {
			startAudio();
		} else {
			stopAudio();
		}
	}

	/** A chapter's first beat is at its start, so the jump lands just past it to show that beat. */
	function seekChapter(i: number) {
		const chapter = chapters[Math.max(0, Math.min(chapters.length - 1, i))]!;

		seekTo(chapter.t && chapter.t + 0.001);
	}

	if (chapters.length) {
		k('chapter').addEventListener('change', (event) =>
			seekChapter(Number((event.target as HTMLSelectElement).value)),
		);
		// As a media player does: back to the start of this chapter, or to the one before when
		// already near its start.
		k('prevChapter').addEventListener('click', () => {
			const current = chapterAt(tl.time());

			seekChapter(tl.time() - chapters[current]!.t > 2 ? current : current - 1);
		});
		k('nextChapter').addEventListener('click', () => seekChapter(chapterAt(tl.time()) + 1));
		k('stepMode').addEventListener('click', () => {
			stepByStep = !stepByStep;
			syncControls();
		});
	}
	/*
	 * Browsers start sound only from a click, so it begins off until the viewer turns it on. It plays
	 * from a media element rather than from Web Audio alone: an iPhone with its silent switch on
	 * mutes Web Audio but not a playing media element, and only a media element reaches the lock
	 * screen and the media keys. The element still plays through a gain node, as an iPhone ignores a
	 * media element's own volume. The timeline keeps the time; the element is moved to it on drift.
	 */
	const media = document.createElement('audio');

	media.hidden = true;
	media.preload = 'auto';
	document.body.appendChild(media);
	let audio: AudioContext | null = null;
	/** The volume slider's level, which the element plays through. */
	let level: GainNode | null = null;

	function stopAudio() {
		media.pause();
		syncMediaSession();
	}

	function startAudio() {
		const track = musicOn ? soundtrack : voiceTrack;

		if (!soundOn || !track || !audio || tl.paused() || tl.progress() === 1) {
			return stopAudio();
		}

		// An iPhone suspends the context when it locks or takes a call, leaving the element mute.
		if (audio.state !== 'running') {
			void audio.resume();
		}

		if (media.src !== track) {
			media.src = track;
		}
		media.currentTime = tl.time();
		media.play().catch((error: DOMException) => {
			// Turned away for want of a click; a swap of track interrupting it is an AbortError.
			if (error.name === 'NotAllowedError') {
				void setSound(false);
			}
		});
		syncMediaSession();
	}

	function syncAudio() {
		if (!soundOn) {
			return;
		}

		if (tl.paused() || tl.progress() === 1) {
			return stopAudio();
		}

		// A track a frame shorter than the timeline ends first, and stays ended.
		if (media.paused) {
			return media.ended ? undefined : startAudio();
		}

		if (
			!media.seeking &&
			media.readyState >= HTMLMediaElement.HAVE_METADATA &&
			Math.abs(media.currentTime - tl.time()) > 0.15
		) {
			media.currentTime = tl.time();
		}
	}

	/** Perceived loudness follows the square of the gain more closely than the gain itself. */
	const syncLevel = () => {
		if (level) {
			level.gain.value = (Number(volume.value) / 100) ** 2;
		}
	};

	async function setSound(on: boolean) {
		soundOn = on;
		syncControls();

		if (!on) {
			return stopAudio();
		}

		if (!audio) {
			audio = new AudioContext();
			level = audio.createGain();
			audio.createMediaElementSource(media).connect(level);
			level.connect(audio.destination);
			syncLevel();

			// Safari's own switch for the same thing: sound that plays with the silent switch on.
			if (navigator.audioSession) {
				navigator.audioSession.type = 'playback';
			}
		}
		void audio.resume();
		// Started within the click where the track is ready, as Safari asks.
		startAudio();
		await (musicOn ? soundtrackReady : loadVoiceTrack());

		if (media.paused) {
			startAudio();
		}
	}
	soundBtn.addEventListener('click', () => void setSound(!soundOn));
	volume.addEventListener('input', syncLevel);

	/* With the music off the player swaps to the voice alone, picking up at the same moment. */
	musicBtn?.addEventListener('click', async () => {
		musicOn = !musicOn;
		syncControls();
		startAudio();
		await (musicOn ? soundtrackReady : loadVoiceTrack());

		if (media.paused) {
			startAudio();
		}
	});

	/*
	 * The lock screen, Control Center and the keyboard's media keys, which reach a page only while
	 * its media element plays: play and pause, skip ten seconds, seek, and step through chapters.
	 */
	const session = 'mediaSession' in navigator ? navigator.mediaSession : null;

	function syncMediaSession() {
		if (!session) {
			return;
		}
		session.playbackState = tl.paused() || tl.progress() === 1 ? 'paused' : 'playing';

		try {
			session.setPositionState({ duration: END, position: tl.time(), playbackRate: 1 });
		} catch {}
	}

	if (session) {
		const stopped = () => tl.paused() || tl.progress() === 1;
		const actions: [MediaSessionAction, MediaSessionActionHandler][] = [
			['play', () => stopped() && playBtn.click()],
			['pause', () => !stopped() && playBtn.click()],
			['seekbackward', (details) => seekTo(tl.time() - (details.seekOffset ?? SKIP))],
			['seekforward', (details) => seekTo(tl.time() + (details.seekOffset ?? SKIP))],
			['seekto', (details) => seekTo(details.seekTime ?? tl.time())],
		];

		if (chapters.length) {
			actions.push(
				['previoustrack', () => k('prevChapter').click()],
				['nexttrack', () => k('nextChapter').click()],
			);
		}
		session.metadata = new MediaMetadata({
			title: document.title,
			artist: 'The Bay Compassion',
			artwork: [{ src: LOGO, sizes: '512x512', type: 'image/svg+xml' }],
		});

		for (const [action, handler] of actions) {
			try {
				session.setActionHandler(action, handler);
			} catch {
				// An action this browser doesn't offer.
			}
		}
	}

	let pendingRestart: gsap.core.Tween | null = null;

	tl.eventCallback('onComplete', () => {
		syncControls();
		stopAudio();

		if (!document.body.classList.contains('record') && !document.body.classList.contains('watch')) {
			pendingRestart = gsap.delayedCall(3, () => tl.restart());
		}
	});
	playBtn.addEventListener('click', () => {
		if (tl.progress() === 1) {
			tl.restart();
		} else {
			tl.paused(!tl.paused());
		}
		syncControls();

		if (tl.paused()) {
			stopAudio();
		} else {
			startAudio();
		}
	});
	k('restart').addEventListener('click', () => {
		tl.restart();
		syncControls();
		startAudio();
	});
	scrub.addEventListener('input', () => {
		tl.pause();
		stopAudio();
		tl.time((Number(scrub.value) / 1000) * END);
		syncControls();
	});

	/*
	 * A frame on the stage runs part of the app, whose dialogs focus themselves as a scene opens
	 * them. That takes the keyboard into the frame, away from the keys below, so take it back. The
	 * frames are `srcdoc`, so their documents are this page's to listen to.
	 */
	for (const frame of document.querySelectorAll<HTMLIFrameElement>('iframe[aria-hidden="true"]')) {
		const reclaim = () =>
			frame.contentDocument?.addEventListener('focusin', () => {
				(frame.contentDocument?.activeElement as HTMLElement | null)?.blur();
				frame.blur();
				window.focus();
			});

		frame.addEventListener('load', reclaim);
		reclaim();
	}

	/*
	 * Keys as YouTube takes them: Space plays and pauses wherever the focus is, even on a button,
	 * which Enter still presses. Only a list or a text field keeps Space, and a slider, a list or a
	 * text field keeps the arrows.
	 */
	document.addEventListener('keydown', (event) => {
		const target = event.target as HTMLElement;
		const skip = event.key === 'ArrowLeft' ? -SKIP : event.key === 'ArrowRight' ? SKIP : 0;

		if (record || event.altKey || event.ctrlKey || event.metaKey || (event.key !== ' ' && !skip)) {
			return;
		}

		if (
			target.closest(
				skip
					? 'input, select, textarea, [contenteditable]'
					: 'input:not([type="range"]), select, textarea, [contenteditable]',
			)
		) {
			return;
		}
		event.preventDefault();

		if (skip) {
			seekTo(tl.time() + skip);
		} else {
			playBtn.click();
		}
	});

	// A focused button presses itself as Space comes back up, in some browsers even after the key
	// went down to play or pause.
	document.addEventListener('keyup', (event) => {
		if (event.key === ' ' && (event.target as HTMLElement).closest('button')) {
			event.preventDefault();
		}
	});

	/* ---------- dev mode (#dev) ---------- */

	// GSAP's own scrubber along the bottom, and every beat of the script down the side: what it
	// changes, when, and the line in the page's source that schedules it. Click one to jump there.
	function devRows() {
		const rows: DevRow[] = [];

		for (let i = 1; i < snaps.length; i++) {
			const snap = snaps[i]!;
			const { items, minor } = describeBeat(snaps[i - 1]!.s, snap.s);
			const beat = { t: snap.t, line: snap.opts.line };
			const last = rows[rows.length - 1];

			if (minor && last?.minor === minor) {
				last.count = (last.count ?? 0) + 1;
				last.end = beat.t;
			} else if (minor) {
				rows.push({ ...beat, minor, count: 1, end: beat.t, text: minor });
			} else if (items.length) {
				rows.push({ ...beat, text: items.join(' · ') });
			}
		}

		return rows;
	}

	let devStarted = false;

	async function startDevMode() {
		if (devStarted) {
			return;
		}

		devStarted = true;
		tl.pause();
		stopAudio();
		document.body.classList.add('dev');
		const panel = document.createElement('aside');

		panel.id = 'beats';
		panel.innerHTML =
			'<header><h2>Beats</h2><span id="beatClock">0.00s</span><button type="button" id="devSound">Sound off</button></header>' +
			'<p>Click a beat to jump to it. <b>L</b> numbers are lines in <code>' +
			esc(source) +
			'</code>.</p><ol></ol>';
		document.body.appendChild(panel);
		const list = one(panel, 'ol');
		const rows = devRows();
		const buttons = rows.map((row) => {
			const li = document.createElement('li');
			const button = document.createElement('button');

			button.type = 'button';

			if (row.minor) {
				button.className = 'minor';
			}
			const count = row.count ?? 1;
			const span =
				count > 1 ? row.t.toFixed(2) + '–' + (row.end ?? row.t).toFixed(2) : row.t.toFixed(2);

			button.innerHTML =
				'<time>' +
				span +
				'</time><span>' +
				esc(row.text) +
				(count > 1 ? ' ×' + count : '') +
				'</span>' +
				'<code>' +
				(row.line ? 'L' + row.line : '') +
				'</code>';
			button.addEventListener('click', () => {
				tl.pause();
				stopAudio();
				tl.time(row.t + 0.001);
			});
			li.appendChild(button);
			list.appendChild(li);

			return button;
		});
		const clockEl = one(panel, '#beatClock');
		let active = -1;

		devTick = () => {
			const time = tl.time();

			clockEl.textContent = time.toFixed(2) + 's';
			let i = -1;

			while (i + 1 < rows.length && rows[i + 1]!.t <= time) {
				i++;
			}

			if (i === active) {
				return;
			}
			buttons[active]?.removeAttribute('aria-current');
			active = i;

			const current = buttons[i];

			if (current) {
				current.setAttribute('aria-current', 'true');
				current.scrollIntoView({ block: 'nearest' });
			}
		};
		const devSound = one(panel, '#devSound');

		devSound.addEventListener('click', async () => {
			await setSound(!soundOn);
			devSound.textContent = soundOn ? 'Sound on' : 'Sound off';
		});
		devTick();

		try {
			await new Promise((resolve, reject) => {
				const script = document.createElement('script');

				script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/GSDevTools.min.js';
				script.onload = resolve;
				script.onerror = reject;
				document.head.appendChild(script);
			});
			gsap.registerPlugin(GSDevTools);
			GSDevTools.create({ animation: tl, globalSync: false, persist: false, paused: true });
		} catch {
			one(panel, 'p').textContent = 'GSDevTools could not load; the beat list still works.';
		}
	}

	const record = location.hash === '#record';
	const watch = location.hash === '#watch';

	if (record) {
		document.body.classList.add('record');
	}

	if (watch) {
		document.body.classList.add('watch');
	}
	const reel: Reel = {
		tl,
		END,
		cues,
		chapters,
		seek: (sec) => {
			tl.pause();
			tl.time(sec);
		},
		setSound,
		soundtrackReady,
		loadVoiceTrack,
		settle,
	};

	window.reel = reel;
	render();
	syncControls();
	const dev = location.hash === '#dev';

	if (dev) {
		void startDevMode();
	}

	// Typing #dev onto an open page changes only the hash, which does not reload it, so watch for it.
	window.addEventListener('hashchange', () => {
		if (location.hash === '#dev') {
			void startDevMode();
		}
	});
	k('devOpen').addEventListener('click', () => {
		history.replaceState(null, '', '#dev');
		void startDevMode();
	});
	const start = () => (record || dev || watch ? null : tl.play());

	void Promise.all([document.fonts.ready, ready]).then(start);
}

const stage = {
	S,
	DESK,
	LOGO,
	LANGS,
	ENGLISH,
	RTL,
	DIGITS,
	KIOSK_ROTATION,
	nativeOf,
	esc,
	label,
	k,
	one,
	beatScript,
	snapshotAt,
	narrationCues,
	cap,
	put,
	appBar,
	statusHtml,
	guestApp,
	phoneFrame,
	renderGuestPhone,
	renderKiosk,
	renderCaption,
	mountPlayer,
};

export type Stage = typeof stage;

declare global {
	interface Window {
		stage: Stage;
	}

	/** Safari's Audio Session API, which TypeScript's DOM types don't carry yet. */
	interface Navigator {
		audioSession?: {
			type: 'auto' | 'playback' | 'transient' | 'transient-solo' | 'ambient' | 'play-and-record';
		};
	}
}

window.stage = stage;
