/**
 * The admin guide: the market dashboard through one market day, from the schedule to closing the
 * session, paced by the narration. The dashboard, its market, and the timeline around it come from
 * `stage/admin-guide.ts`; this script holds the chapters and the beats — what the dashboard shows
 * at each moment, and the captions over it. Waits for the stage, which the build inlines after this
 * script.
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
		name: 'Market Dashboard Guide',
		source: 'admin-guide/page.ts',
		narration: __NARRATION__,
		role: 'coordinator',
		chapters: {
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
		},
	});
	const { PEOPLE, CAPACITY, WALK_IN, BLANK_GUEST, register } = market;

	/* ================= the beat script ================= */

	openPhone('tabs', '10:12');
	line(
		'tabs',
		['Getting started', 'Sign in on your phone.', 'Tabs along the bottom, and More for the rest.'],
		'switcher',
		null,
	);
	// More opens the sheet of the other screens, which stays up into the first move.
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
		'field:capacity',
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
		'timer',
	);
	at(C('pending', 0.45), (s) => {
		s.focus = 'button:pauseLottery';
	});
	line('draw', [A.lotteryActions, A.runLotteryNow, A.confirmRunLottery], 'button:runLotteryNow');
	confirm(C('draw', 0.15), 'button:runLotteryNow', 'sheet:confirmContinue', (s) => {
		s.time = '10:47';
		market.draw(s);
	});

	// Service.
	at(C('overview'), market.midService);
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
		'line-actions',
	);
	tap(C('addGuest', 0.45), 'line-actions', (s) => {
		s.focus = null;
		s.scrollTo = null;
		s.addGuest = { ...BLANK_GUEST };
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
		s.cap = {
			eyebrow: A.broadcastTitle,
			head: A.broadcastSend,
			sub: A.broadcastHelp,
		};
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
		market.everyoneServed(s);
	});
	line('close', [A.queue, A.closeSession, A.confirmCloseSession], 'button:closeSession');
	confirm(C('close', 0.5), 'button:closeSession', 'sheet:closeSession', (s) => {
		s.status = 'ended';
		s.archived = true;
	});
	go(before('next'), 'current-session');
	line('next', [A.currentSession, 'Ready for next week.', A.scheduleIntro], 'step');
	closePhone('thanks');
	finish(E('thanks', 4));
});
