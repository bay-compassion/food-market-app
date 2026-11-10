/**
 * The team leader guide: market day on the dashboard as a team leader runs it, from the Checklist to
 * closing the session, paced by the narration. The dashboard is signed in as a team leader, so it
 * offers what one gets — no guest database, no workers. The dashboard, its market, and the timeline
 * around it come from `stage/admin-guide.ts`; this script holds the chapters and the beats. Waits
 * for the stage, which the build inlines after this script.
 */
import type { TimedLine } from '../stage/reel.ts';

declare const __NARRATION__: TimedLine[];

document.addEventListener('DOMContentLoaded', () => {
	const {
		A,
		market,
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
	} = window.adminGuide.create({
		name: 'Team Leader Guide',
		source: 'team-leader-guide/page.ts',
		narration: __NARRATION__,
		role: 'team-leader',
		chapters: {
			intro: 'Introduction',
			setup: 'Setting Up',
			session: 'Registration and the Lottery',
			service: 'Service',
			closing: 'Closing the Session',
		},
		initial: { time: '09:40' },
	});
	const { PEOPLE, WALK_IN, BLANK_GUEST, register } = market;
	const L = A.checklist;
	/** Ticks off Checklist steps, one after another, from `start`. */
	const tick = (start: number, steps: string[], gap = 0.5) =>
		steps.forEach((step, i) =>
			at(start + i * gap, (s) => {
				s.checklist = [...s.checklist, step];
			}),
		);

	/**
	 * Opens `view` as line `id` starts, so its caption, its words and its screen arrive together,
	 * then points at `focus` once the screen is up.
	 */
	const move = (
		id: string,
		view: Parameters<typeof go>[1],
		focus: Parameters<typeof line>[2],
		action?: Parameters<typeof go>[2],
	) => {
		go(C(id), view, action);
		at(C(id) + 0.8, (s) => {
			s.focus = focus ?? null;
			s.scrollTo = focus ?? null;
		});
	};

	/* ================= the beat script ================= */

	// The pace is deliberate: each line points at one thing, a new screen opens as the line about it
	// starts (never under the last line's caption), and anything that moves — a tick, a sheet, a
	// guest signing up — happens while the narration is on it, one at a time.

	// Signing in: the screens a team leader has, behind More.
	openPhone('yours', '09:40');
	line(
		'yours',
		[
			'Getting started',
			'Sign in on your phone.',
			'Workers and the guest database stay with coordinators.',
		],
		'switcher',
		null,
	);
	at(C('yours', 0.45), (s) => {
		s.navigating = true;
		s.focus = 'navigation';
	});

	// The Checklist, station by station.
	line('checklist', [L.title, L.session.scheduledTitle, L.intro]);
	tap(C('checklist'), 'tab:checklist', (s) => {
		s.navigating = false;
		s.view = 'checklist';
		s.scrollTo = null;
	});
	at(C('checklist') + 0.8, (s) => {
		s.focus = 'checklist-session';
	});
	line('stations', [L.title, L.roomDisplay.title, L.roomDisplay.place], 'station:roomDisplay');
	tick(C('stations', 0.55), ['room-place', 'room-power'], 1.2);
	line(
		'unlock',
		[L.roomDisplay.title, L.roomDisplay.getCode, L.roomDisplay.unlockHint],
		'task:room-open',
	);
	// The rest of the room display, ticked in the pause, folds the station away.
	tick(E('unlock') + 0.2, ['room-open', 'room-full-screen'], 0.5);
	// Check-in's earlier steps are done by the time the narration reaches the printing station.
	at(before('printing'), (s) => {
		s.checklist = [
			...s.checklist,
			'check-in-place',
			'check-in-power',
			'printing-power',
			'printing-quit-chrome',
			'printing-start',
		];
	});
	line(
		'printing',
		[L.checkIn.title, L.automatic, `${L.doneWhen} ${L.checkIn.doneWhen}`],
		'task:printing-wait-online',
	);

	// Registration, on its own, and changing the plan.
	line('today', [A.open, 'Registration runs on its own.', `${A.registrationOpenUntil} 10:45 AM`]);
	move('today', 'current-session', 'status', (s) => {
		s.status = 'registration_open';
		s.time = '10:30';
	});
	at(C('today', 0.5), (s) => {
		s.focus = 'heading:registered';
		s.scrollTo = 'heading:registered';
	});
	// Guests sign up once the list is in view, one every forty seconds or so on the clock.
	PEOPLE.forEach((_, i) => {
		const seconds = 30 + i * 40;

		at(C('today', 0.58) + i * ((E('today') - C('today', 0.58)) / PEOPLE.length), (s) => {
			register(s, i + 1);
			s.time = `10:${String(30 + Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
		});
	});
	line('adjust', [A.open, A.today.changeThePlan, A.today.extendRegistration], 'plan');
	confirm(
		C('adjust', 0.72),
		'button:closeRegistration',
		'sheet:confirmContinue',
		(s) => {
			s.status = 'registration_closed';
			s.time = '10:44:50';
			s.closesAt = '10:44:50';
		},
		1.4,
	);

	// The lottery.
	at(C('lottery'), (s) => {
		s.status = 'lottery_pending';
		s.time = '10:45:20';
	});
	line(
		'lottery',
		[A.lotteryActions, A.runLotteryNow, A.lotteryDrawsAt.replace('{time}', '10:50 AM')],
		'timer',
	);
	at(C('lottery', 0.5), (s) => {
		s.focus = 'button:runLotteryNow';
	});
	confirm(
		C('lottery', 0.8),
		'button:runLotteryNow',
		'sheet:confirmContinue',
		(s) => {
			s.time = '10:47';
			market.draw(s);
		},
		1.4,
	);

	// Service: the queue, adding a guest by hand, and a broadcast.
	line('queue', [
		A.queue,
		'Volunteers call guests up.',
		'Calling guests is in the queue desk guide.',
	]);
	move('queue', 'queue', null, market.midService);
	line('addGuest', [A.queue, A.manualGuestTitle, A.placeEnd], 'line-actions');
	tap(C('addGuest', 0.25), 'line-actions', (s) => {
		s.scrollTo = null;
		s.addGuest = { ...BLANK_GUEST };
	});
	type(C('addGuest', 0.32), WALK_IN.first, (s, v) => (s.addGuest!.firstName = v), 0.09);
	type(C('addGuest', 0.42), WALK_IN.last, (s, v) => (s.addGuest!.lastName = v), 0.09);
	at(C('addGuest', 0.52), (s) => {
		s.addGuest = {
			...s.addGuest!,
			phone: WALK_IN.phone,
			ageRange: '30-44',
			householdSize: WALK_IN.household,
			childrenCount: 1,
			seniorsCount: 0,
		};
	});
	at(C('addGuest', 0.6), (s) => {
		s.cap = { eyebrow: A.admissionLegend, head: A.admitToQueue, sub: A.placeEnd };
		s.focus = 'field:admissionLabel';
		s.scrollTo = 'field:admissionLabel';
	});
	tap(E('addGuest', -0.6), 'button:saveGuest', (s) => {
		s.addGuest = null;
		s.guests.push({ ...WALK_IN });
		s.scrollTo = null;
	});

	line('broadcast', [A.broadcastTitle, 'Reach every guest at once.', A.broadcastHelp]);
	move('broadcast', 'broadcast', 'field:broadcastTitleLabel');
	type(C('broadcast') + 1, 'Service is running late', (s, v) => (s.broadcast.title = v), 0.06);
	type(
		C('broadcast', 0.4),
		'We start again in ten minutes. Please wait for your number.',
		(s, v) => {
			s.broadcast.body = v;
			s.focus = 'field:broadcastMessageLabel';
		},
		0.04,
	);
	confirm(
		E('broadcast', -1.2),
		'button:broadcastSend',
		'sheet:broadcastSend',
		(s) => {
			s.broadcast = { title: '', body: '' };
		},
		1.4,
	);

	// Closing the session, and next week's market on Today.
	line('close', [A.queue, A.closeSession, A.confirmCloseSession]);
	move('close', 'queue', 'button:closeSession', (s) => {
		s.time = '13:05';
		market.everyoneServed(s);
	});
	confirm(C('close', 0.45), 'button:closeSession', 'sheet:closeSession', (s) => {
		s.status = 'ended';
		s.archived = true;
	});
	closePhone('thanks');
	go(C('thanks'), 'current-session');

	finish(E('thanks', 4));
});
