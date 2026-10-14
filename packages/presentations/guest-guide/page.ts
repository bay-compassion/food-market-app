/**
 * The guest market guide: a guest's phone from opening the market page to check-in, paced by the
 * narration. Waits for the stage, which the build inlines after this script.
 */
import type { Locale } from '../../../src/locales.ts';
import type { TimedLine } from '../stage/reel.ts';
import type { StageGuest } from '../stage/stage.ts';

declare const __NARRATION__: TimedLine[];

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

interface GuideState {
	phase: 'title' | 'phone' | 'display';
	title: boolean;
	phone: boolean;
	kiosk: boolean;
	outro: boolean;
	page: Page;
	caption: CaptionId | null;
	/** The element the narration points at, by its `data-mark`. */
	focus: string | null;
	/** The element a finger is on, by its `data-mark`. */
	tap: string | null;
	scroll: number;
	returning: boolean;
	consent: boolean;
	consentChecked: boolean;
	texts: boolean;
	registrationClosed: boolean;
	/** Seconds left to register. */
	clock: number;
	nowCalling: number | null;
	/** The guest whose phone this is, by number. */
	featured: number;
	time: string;
	form: { first: string; last: string; phone: string };
	guests: StageGuest[];
}

document.addEventListener('DOMContentLoaded', () => {
	const {
		S,
		LANGS,
		RTL,
		esc,
		k,
		one,
		beatScript,
		snapshotAt,
		narrationCues,
		put,
		guestApp,
		phoneFrame,
		statusHtml,
		renderGuestPhone,
		renderCaption,
		renderKiosk,
		mountPlayer,
	} = window.stage;
	const { cues, chapters, C, E } = narrationCues(__NARRATION__);
	let locale: Locale = 'en';
	const phone = phoneFrame('10:30');

	phone.id = 'guestPhone';
	k('phoneMotion').appendChild(phone);
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
		scroll: 0,
		returning: false,
		consent: false,
		consentChecked: false,
		texts: false,
		registrationClosed: false,
		clock: 840,
		nowCalling: null,
		featured: 4,
		time: '10:30',
		form: { first: '', last: '', phone: '' },
		guests: ['Luis Herrera', 'Mai Nguyen', 'Grace Okafor', 'Maya Rivera', 'Amal Haddad'].map(
			(name, i) => {
				const [first = '', last = ''] = name.split(' ');

				return { n: i + 1, first, last, loc: 'en', status: 'registered', warmth: 0 };
			},
		),
	};
	const { at, snapshots } = beatScript(initial);
	const g = (s: GuideState, n: number) => s.guests[n - 1]!;
	const scene = (id: CaptionId, page: Page, caption: CaptionId, focus: string | null = null) =>
		at(C(id), (s) => {
			s.page = page;
			s.caption = caption;
			s.focus = focus;
			s.scroll = 0;
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
	at(C('household'), (s) => {
		s.scroll = -445;
	});
	scene('returning', 'form', 'returning', 'identity-card');
	at(C('returning'), (s) => {
		s.featured = 1;
		s.returning = true;
	});
	scene('join', 'form', 'join', 'join');
	at(C('join'), (s) => {
		s.featured = 4;
		s.returning = false;
		s.scroll = -445;
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
		s.clock = 0;
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
		g(s, 1).status = 'called';
		s.nowCalling = 1;
		s.time = '11:30';
	});
	at(C('line', 0.7), (s) => {
		g(s, 1).status = 'served';
		g(s, 2).status = 'called';
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
		g(s, 3).status = 'called';
		g(s, 4).status = 'called';
		s.nowCalling = 4;
	});
	scene('checkin', 'visit', 'checkin', 'number');
	at(C('checkin'), (s) => {
		s.kiosk = false;
		s.phase = 'phone';
	});
	scene('late', 'visit', 'late', 'number');

	// Compress the passage of ten minutes, using LateArrival's squared ramp after minute three.
	for (let minute = 3; minute <= 10; minute++) {
		at(C('late', (minute - 3) / 10), (s) => {
			g(s, 4).warmth = ((minute - 3) / 7) ** 2;
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
				G.serviceState.inProgressHeading,
				G.serviceState.inProgressDescription,
			],
			help: [H.title, H.needHelp.heading, H.needHelp.body],
		};
		const [eyebrow, head, sub] = captions[id];

		return { eyebrow: String(eyebrow), head, sub };
	}
	type Guide = (typeof S)[Locale]['guide'];
	type Copy = (typeof S)[Locale];
	const help = (G: Guide) =>
		'<div class="guide-help" data-mark="help">' +
		esc(G.helpPrompt) +
		'<strong>' +
		esc(G.help.title) +
		'</strong></div>';
	const identity = (s: GuideState, G: Guide) =>
		'<div class="guide-identity" data-mark="identity-card"><small>' +
		esc(G.identityIndicator.heading) +
		'</small><strong>' +
		esc(g(s, s.featured).first + ' ' + g(s, s.featured).last) +
		'</strong>' +
		(s.texts
			? esc(G.identityIndicator.notificationsEnabled)
			: '<span class="outlined" data-mark="texts">' +
				esc(G.identityIndicator.notificationsAction) +
				'</span>') +
		'</div>';
	const field = (label: string, value: string) =>
		'<div class="field"><label>' + esc(label) + '</label><span>' + esc(value) + '</span></div>';

	function formHtml(s: GuideState, L: Copy) {
		const G = L.guide;
		const clock =
			String(Math.floor(s.clock / 60)).padStart(2, '0') +
			':' +
			String(s.clock % 60).padStart(2, '0');
		const counts = [
			[G.household, '3', G.householdHint],
			[G.children, '1', ''],
			[G.seniors, '0', ''],
		] as const;

		return (
			'<div class="guide-scroll" style="transform:translateY(' +
			s.scroll +
			'px)">' +
			(s.returning ? identity(s, G) : '') +
			'<div class="countdown" data-mark="timer" style="--progress:0"><span>' +
			esc(L.closesIn) +
			'</span><strong>' +
			clock +
			'</strong></div>' +
			help(G) +
			'<h2>' +
			esc(G.formTitle) +
			'</h2><p>' +
			esc(G.formDescription) +
			'</p>' +
			(s.returning
				? ''
				: '<div class="fieldset" data-mark="identity"><div class="legend">' +
					esc(L.info) +
					'</div>' +
					field(L.firstName, s.form.first) +
					field(L.lastName, s.form.last) +
					field(L.phone, s.form.phone) +
					'</div>') +
			'<div class="fieldset" data-mark="household"><div class="legend">' +
			esc(G.forms.lotteryLegend) +
			'</div>' +
			field(G.age, G.ageRange) +
			counts
				.map(
					([label, n, hint]) =>
						'<div class="guide-count"><span>' +
						esc(label) +
						'<small>' +
						esc(hint) +
						'</small></span><b>− ' +
						n +
						' +</b></div>',
				)
				.join('') +
			'</div>' +
			'<div class="submit" data-mark="join">' +
			esc(L.joinLottery) +
			'</div><p>' +
			esc(G.privacy) +
			'</p></div>'
		);
	}

	function phoneHtml(s: GuideState): string {
		const L = S[locale],
			G = L.guide;
		const panel = (heading: string, description: string, mark = '—') =>
			'<div class="panel"><div class="mark muted">' +
			mark +
			'</div><h2>' +
			esc(heading) +
			'</h2><p>' +
			esc(description) +
			'</p></div>' +
			help(G);

		switch (s.page) {
			case 'language':
				return (
					'<div class="hero"><h1>' +
					esc(L.welcome) +
					'</h1><p class="language-prompt">' +
					esc(L.languagePrompt) +
					'</p><div class="language-list" data-mark="languages">' +
					LANGS.map(
						([code, name]) =>
							'<span data-mark="language-' +
							code +
							'" class="language-option' +
							(code === locale ? ' active' : '') +
							'">' +
							esc(name) +
							'</span>',
					).join('') +
					'</div><p class="language-prompt">' +
					esc(G.languageHint) +
					'</p></div>'
				);
			case 'closed':
				return panel(G.notOpenState.heading, G.notOpenState.subheading);
			case 'form':
				return formHtml(s, L);
			case 'submitting':
				return panel(G.submitting, G.privacy, '…');
			case 'missed-window':
				return (
					identity(s, G) +
					panel(G.registrationClosedState.heading, G.registrationClosedState.description)
				);
			case 'underway':
				return (
					identity(s, G) +
					panel(G.serviceState.inProgressHeading, G.serviceState.inProgressDescription, '⋯')
				);
			case 'help':
				return (
					'<div class="guide-scroll" data-mark="help"><h2>' +
					esc(G.help.title) +
					'</h2><p>' +
					esc(G.help.introBody) +
					'</p>' +
					G.help.steps
						.map(
							(step) =>
								'<div><div class="legend">' +
								esc(step.time ?? '') +
								' ' +
								esc(step.title) +
								'</div><p>' +
								esc(step.body) +
								'</p></div>',
						)
						.join('') +
					'</div>'
				);
			case 'visit':
				return identity(s, G) + statusHtml(s, { ...g(s, s.featured), loc: locale }) + help(G);
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
				['outro', G.help.needHelp.heading, G.help.needHelp.body],
			] as const) {
				const card = k(id);

				card.setAttribute('dir', dir);
				put(one(card, '.line'), esc(heading));
				put(one(card, '.sub'), esc(sub));
			}
			k('cap').setAttribute('dir', dir);
			const x = g(s, s.featured);

			renderGuestPhone(
				phone,
				guestApp(locale, '<div class="guide-content">' + phoneHtml(s) + '</div>'),
				s.page === 'visit' ? x.status : s.page,
			);
			one(phone, '.statusbar > span').textContent = s.time;
			const board = phone.querySelector<HTMLElement>('.board');

			if (board) {
				board.dataset.mark = 'number';
			}
			const calling = phone.querySelector<HTMLElement>('.nowcalling');

			if (calling) {
				calling.dataset.mark = 'nowcalling';
			}
			phone.querySelector('.guide-consent')?.remove();

			if (s.consent) {
				one(phone, '.screen').insertAdjacentHTML(
					'beforeend',
					'<div class="guide-consent" dir="' +
						dir +
						'"><div><h2>' +
						esc(G.identityIndicator.notificationsDialogTitle) +
						'</h2><p>' +
						(s.consentChecked ? '☑ ' : '☐ ') +
						esc(G.notificationOptIn.consentLabel) +
						'</p><div class="submit" data-mark="enable">' +
						esc(G.notificationOptIn.enable) +
						'</div></div></div>',
				);
			}

			for (const el of phone.querySelectorAll<HTMLElement>('[data-mark]')) {
				el.classList.toggle('spot', el.dataset.mark === s.focus);
				const tapped = s.tap === 'language-en' ? 'language-' + locale : s.tap;

				el.classList.toggle('tapping', el.dataset.mark === tapped);
			}
			// The real page scrolls. Keep the complete number board and calling row in view
			// even when a translated heading takes more lines than English.
			const content = one(phone, '.guide-content');

			content.style.transform = '';
			const standing = phone.querySelector('.standing');

			if (standing) {
				const layout = one(phone, '.guest-layout').getBoundingClientRect();
				const scale = layout.width / 320;
				const offset = Math.max(
					0,
					(standing.getBoundingClientRect().bottom - layout.bottom) / scale + 12,
				);

				content.style.transform = 'translateY(-' + offset + 'px)';
			}
		}
		const timer = phone.querySelector('.countdown strong');

		if (timer && !s.registrationClosed) {
			const remaining = Math.max(0, s.clock - Math.floor(Math.max(0, time - C('window'))));

			timer.textContent =
				String(Math.floor(remaining / 60)).padStart(2, '0') +
				':' +
				String(remaining % 60).padStart(2, '0');
		}
		renderKiosk(s, Math.max(0, Math.floor((time - C('display')) / 3.4)));
	}
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
