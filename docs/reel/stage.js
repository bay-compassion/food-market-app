/**
 * Shared by every video in docs/reel: the helpers a beat script is written with, the guest phone
 * and room display views, captions, and the player — controls, soundtrack, `#record` for capture,
 * and `#dev` for editing.
 *
 * The build inlines this file at the end of the page, after the page's own script, so line numbers
 * in the built page still match its source. A page therefore waits for `DOMContentLoaded` and then
 * reads everything it needs from `window.stage`. The build also fills in the guest copy from
 * `src/locales.ts`, the logo, and the page's own soundtrack.
 */
(() => {
	const S = __STRINGS__;
	/** The queue desk's copy, from `src/adminLocales.ts`. Staff screens are English only. */
	const DESK = __DESK__;
	const LOGO = '__LOGO__';
	const SOUNDTRACK = '__SOUNDTRACK__';
	const LANGS = [
		['en', 'English'],
		['es', 'Español'],
		['tl', 'Tagalog'],
		['zh', '中文'],
		['fa', 'فارسی'],
		['ar', 'العربية'],
		['vi', 'Tiếng Việt'],
		['fr', 'Français'],
	];
	const ENGLISH = {
		en: 'English',
		es: 'Spanish',
		tl: 'Tagalog',
		zh: 'Chinese',
		fa: 'Farsi',
		ar: 'Arabic',
		vi: 'Vietnamese',
		fr: 'French',
	};
	const KIOSK_ROTATION = ['es', 'tl', 'zh', 'fa', 'ar', 'vi', 'fr'];
	const RTL = new Set(['fa', 'ar']);
	const DIGITS = { fa: '۰۱۲۳۴۵۶۷۸۹', ar: '٠١٢٣٤٥٦٧٨٩' };
	const nativeOf = (loc, n) =>
		DIGITS[loc] ? String(n).replace(/\d/g, (d) => DIGITS[loc][d]) : String(n);
	const esc = (v) =>
		String(v).replace(
			/[&<>"]/g,
			(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
		);
	/** A guest's number as shown: `12`, or `P1` for one a volunteer put at the front. */
	const label = (x) => x.label ?? String(x.n);

	/* ================= beat script ================= */

	/**
	 * A list of beats, each changing a copy of the state at a moment, and the snapshot of the state
	 * after every one of them. `at` notes the source line that scheduled a beat, for the #dev list.
	 */
	function beatScript(initial) {
		const script = [];
		// A helper that schedules beats for its caller passes `via: 1`, so the line noted is the
		// caller's rather than the helper's own.
		const at = (t, fn, { via = 0, ...opts } = {}) => {
			const frames = (new Error().stack ?? '')
				.split('\n')
				.filter((frame) => /:\d+:\d+\)?$/.test(frame));
			const line = Number(frames[1 + via]?.match(/:(\d+):\d+\)?$/)?.[1]) || null;

			script.push({ t, fn, opts: { ...opts, line } });
		};
		const snapshots = () => {
			script.sort((a, b) => a.t - b.t);
			const snaps = [{ t: 0, s: structuredClone(initial), opts: {} }];

			for (const beat of script) {
				const s = structuredClone(snaps[snaps.length - 1].s);

				beat.fn(s);
				snaps.push({ t: beat.t, s, opts: beat.opts });
			}

			return snaps;
		};

		return { at, snapshots };
	}

	const cap = (eyebrow, head, sub) => (s) => {
		s.cap = { eyebrow, head, sub };
	};

	/** Replaces an element's markup only when it changed, so CSS animations aren't restarted. */
	const lastHtml = new Map();

	function put(el, html, key = el) {
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
	const appBar = (loc) =>
		'<div class="topbar"><span class="brand"><img alt="" src="' +
		LOGO +
		'"><span>' +
		esc(S[loc].marketName || 'The Bay Compassion') +
		'</span></span><span class="acts">' +
		helpIcon +
		translateIcon +
		'</span></div>';

	/** The guest's visit card, in their language: registered, waiting, called, served, not placed. */
	function statusHtml(s, x) {
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

		if (x.status === 'registered') {
			// Warms toward the error colour over the last five minutes, as RegistrationCountdown does.
			const progress = Math.min(1, Math.max(0, 1 - s.clock / 300));
			const clock =
				String(Math.floor(s.clock / 60)).padStart(2, '0') +
				':' +
				String(s.clock % 60).padStart(2, '0');

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
						label(s.guests[s.nowCalling - 1]) +
						'</span>' +
						earlier.map((n) => '<span class="tile earlier">' + n + '</span>').join('') +
						'</div>';
			const warmth = x.status === 'called' ? x.warmth : 0;
			const toneColor = x.status === 'called' ? 'var(--color-success)' : 'var(--color-brand-dark)';

			html +=
				'<div class="stamp"><span class="live"></span><span><strong>' +
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
	function guestApp(loc, body) {
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
	function phoneFrame(time) {
		const el = document.createElement('div');

		el.className = 'phone';
		el.innerHTML =
			'<div class="screen"><div class="statusbar"><span>' +
			time +
			'</span><i><s></s><b></b></i></div><div class="app"></div></div>';

		return el;
	}

	/** Draws a guest's screen, replaying the swap and "called" animations when their status moves. */
	function renderGuestPhone(el, html, status) {
		const app = el.querySelector('.app');
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

	const k = (id) => document.getElementById(id);
	const KIOSK =
		'<div class="kscreen"><div class="kheader"><div><span id="kMarket"></span></div>' +
		'<div><span id="kCount"></span><span class="k2" id="kCount2"></span></div></div>' +
		'<div class="klayout"><section class="know">' +
		'<h1><span>Now calling</span><span class="k2" id="kNow2"></span></h1><div id="kNum"></div></section>' +
		'<section class="kpanel"><h2><span>Already Called</span><span class="k2" id="kStill2"></span></h2>' +
		'<ul id="kStill"></ul></section></div><div class="kfooter" id="kFoot"></div></div>';
	let lastKioskNum = null;

	/** The `/kiosk` board: numbers only, English beside a second language that rotates every few seconds. */
	function renderKiosk(s, idx) {
		if (!k('kiosk').firstElementChild) {
			k('kiosk').innerHTML = KIOSK;
			k('kMarket').textContent = S.en.marketName || 'The Bay Compassion';
		}
		const loc = KIOSK_ROTATION[idx % KIOSK_ROTATION.length];
		const K = S[loc].kiosk;
		const waiting = s.guests.filter((x) => x.status === 'waiting' && x.place !== 'hidden').length;
		const dir = RTL.has(loc) ? 'rtl' : 'auto';

		put(k('kCount'), esc(S.en.kiosk.waitingCount.replace('{count}', waiting)));

		const second = (el, text) => {
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
			const now = label(s.guests[s.nowCalling - 1]);

			if (lastKioskNum !== now) {
				numWrap.innerHTML =
					'<strong class="knum"><span>' + now + '</span><span class="nd"></span></strong>';
				lastHtml.delete(numWrap);
				lastKioskNum = now;
			}
			const strong = numWrap.querySelector('.knum');
			const nd = numWrap.querySelector('.nd');
			const hasNative = Boolean(DIGITS[loc]);

			strong.classList.toggle('native', hasNative);
			const native = hasNative ? nativeOf(loc, now) : '';

			if (nd.textContent !== native) {
				nd.textContent = native;
				nd.setAttribute('lang', loc);
			}
			nd.hidden = !hasNative;
		}
		const earlier = s.guests
			.filter((x) => x.status === 'called' && x.n !== s.nowCalling)
			.map(label);

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
				(code, i) => '<i class="' + (i === idx % KIOSK_ROTATION.length ? 'on' : '') + '"></i>',
			).join('') +
				'<span>English · ' +
				esc(LANGS.find(([c]) => c === loc)[1]) +
				'</span>',
		);
	}

	/* ================= captions ================= */

	function renderCaption(s) {
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

	/**
	 * Plays a page's timeline with controls and its soundtrack, and exposes it as `window.reel` for
	 * the capture and still scripts. `#record` hides the controls and waits to be driven; `#dev` adds
	 * GSAP's scrubber and the beat list, which `describeBeat(prev, cur)` writes from the snapshots.
	 */
	function mountPlayer({ tl, END, snaps, describeBeat, source, cues = [] }) {
		const viewport = k('viewport');
		const stage = k('stage');

		viewport.insertAdjacentHTML(
			'afterend',
			'<div id="controls">' +
				'<button type="button" id="play" aria-label="Pause">Pause</button>' +
				'<button type="button" id="restart">Restart</button>' +
				'<button type="button" id="sound" aria-pressed="false">Sound off</button>' +
				'<button type="button" id="devOpen" title="Scrubber and beat list for editing the video">Dev</button>' +
				'<input type="range" id="scrub" min="0" max="1000" value="0" aria-label="Seek" />' +
				'<span id="clock">0:00</span></div>',
		);
		let devTick = null;
		const render = tl.eventCallback('onUpdate');

		tl.eventCallback('onUpdate', () => {
			render();
			syncControls();
			syncAudio();
			devTick?.();
		});
		tl.set({}, {}, END);

		let soundtrack = null;
		const soundtrackReady = (async () => {
			const bytes = Uint8Array.from(atob(SOUNDTRACK), (c) => c.charCodeAt(0));

			return new OfflineAudioContext(2, 1, 44100).decodeAudioData(bytes.buffer);
		})()
			.then((buffer) => (soundtrack = buffer))
			.catch(() => {
				// A browser without AAC decoding plays the video silently rather than offering dead sound.
				const button = k('sound');

				button.disabled = true;
				button.textContent = 'No sound';
			});

		const fit = () => {
			stage.style.transform = 'scale(' + viewport.clientWidth / 1920 + ')';
		};

		new ResizeObserver(fit).observe(viewport);
		fit();

		const playBtn = k('play');
		const scrub = k('scrub');
		const clock = k('clock');
		const fmt = (sec) => Math.floor(sec / 60) + ':' + String(Math.floor(sec % 60)).padStart(2, '0');

		function syncControls() {
			document.body.classList.toggle(
				'watch-title',
				document.body.classList.contains('watch') && tl.paused() && tl.time() === 0,
			);
			scrub.value = String(Math.round((tl.time() / END) * 1000));
			clock.textContent = fmt(tl.time());
			const text = tl.paused() || tl.progress() === 1 ? 'Play' : 'Pause';

			playBtn.textContent = text;
			playBtn.setAttribute('aria-label', text);
		}
		/* Browsers start sound only from a click, so it begins off until the viewer turns it on. */
		const soundBtn = k('sound');
		let audio = null;
		let node = null;
		let soundOn = false;
		let sourceStart = { ctx: 0, offset: 0 };

		function stopAudio() {
			if (!node) {
				return;
			}

			try {
				node.stop();
			} catch {}
			node.disconnect();
			node = null;
		}

		function startAudio() {
			stopAudio();

			if (!soundOn || !soundtrack || !audio || tl.paused() || tl.progress() === 1) {
				return;
			}
			node = audio.createBufferSource();
			node.buffer = soundtrack;
			node.connect(audio.destination);
			sourceStart = { ctx: audio.currentTime, offset: tl.time() };
			node.start(0, tl.time());
		}

		function syncAudio() {
			if (!soundOn) {
				return;
			}

			if (tl.paused() || tl.progress() === 1) {
				return stopAudio();
			}

			if (!node) {
				return startAudio();
			}
			const position = sourceStart.offset + audio.currentTime - sourceStart.ctx;

			if (Math.abs(position - tl.time()) > 0.15) {
				startAudio();
			}
		}

		async function setSound(on) {
			soundOn = on;
			soundBtn.textContent = on ? 'Sound on' : 'Sound off';
			soundBtn.setAttribute('aria-pressed', String(on));

			if (!on) {
				return stopAudio();
			}
			audio ??= new AudioContext();
			await audio.resume();
			await soundtrackReady;
			startAudio();
		}
		soundBtn.addEventListener('click', () => void setSound(!soundOn));

		tl.eventCallback('onComplete', () => {
			syncControls();
			stopAudio();

			if (
				!document.body.classList.contains('record') &&
				!document.body.classList.contains('watch')
			) {
				gsap.delayedCall(3, () => tl.restart());
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

		/* ---------- dev mode (#dev) ---------- */

		// GSAP's own scrubber along the bottom, and every beat of the script down the side: what it
		// changes, when, and the line in the page's source that schedules it. Click one to jump there.
		function devRows() {
			const rows = [];

			for (let i = 1; i < snaps.length; i++) {
				const { items, minor } = describeBeat(snaps[i - 1].s, snaps[i].s);
				const beat = { t: snaps[i].t, line: snaps[i].opts.line };
				const last = rows[rows.length - 1];

				if (minor && last?.minor === minor) {
					last.count += 1;
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
			const list = panel.querySelector('ol');
			const rows = devRows();
			const buttons = rows.map((row) => {
				const li = document.createElement('li');
				const button = document.createElement('button');

				button.type = 'button';

				if (row.minor) {
					button.className = 'minor';
				}
				const span = row.count > 1 ? row.t.toFixed(2) + '–' + row.end.toFixed(2) : row.t.toFixed(2);

				button.innerHTML =
					'<time>' +
					span +
					'</time><span>' +
					esc(row.text) +
					(row.count > 1 ? ' ×' + row.count : '') +
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
			const clockEl = panel.querySelector('#beatClock');
			let active = -1;

			devTick = () => {
				const time = tl.time();

				clockEl.textContent = time.toFixed(2) + 's';
				let i = -1;

				while (i + 1 < rows.length && rows[i + 1].t <= time) {
					i++;
				}

				if (i === active) {
					return;
				}
				buttons[active]?.removeAttribute('aria-current');
				active = i;

				if (buttons[i]) {
					buttons[i].setAttribute('aria-current', 'true');
					buttons[i].scrollIntoView({ block: 'nearest' });
				}
			};
			const devSound = panel.querySelector('#devSound');

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
				panel.querySelector('p').textContent =
					'GSDevTools could not load; the beat list still works.';
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
		window.reel = {
			tl,
			END,
			cues,
			seek: (sec) => {
				tl.pause();
				tl.time(sec);
			},
			setSound,
			soundtrackReady,
		};
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

		void (document.fonts ? document.fonts.ready : Promise.resolve()).then(start);
	}

	window.stage = {
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
		beatScript,
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
})();
