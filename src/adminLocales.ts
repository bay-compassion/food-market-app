import type { ReportColumnKey, ReportId, ReportValueKey } from './services/reports.ts';

export interface AdminTranslation {
	adHocSession: string;
	adHocSessionHelp: string;
	addGuest: string;
	addQuestion: string;
	adminEyebrow: string;
	admissionLabel: string;
	/** Heads the admin-only part of the manual guest form: how the guest enters the session. */
	admissionLegend: string;
	admitAsServed: string;
	admitAsServedHelp: string;
	admitToLottery: string;
	admitToLotteryHelp: string;
	admitToQueue: string;
	admitToQueueHelp: string;
	adminDescription: string;
	adminTitle: string;
	allGuests: string;
	broadcastConfirm: string;
	broadcastHelp: string;
	broadcastMessageLabel: string;
	broadcastNoRecipients: string;
	broadcastQueued: string;
	broadcastSend: string;
	broadcastTitle: string;
	broadcastTitleLabel: string;
	broadcastUnavailable: string;
	cancel: string;
	capacity: string;
	cancelled: string;
	callGuest: string;
	closeSession: string;
	closeRegistration: string;
	closed: string;
	closesAt: string;
	confirmCloseRegistration: string;
	confirmCloseSession: string;
	confirmOpenRegistration: string;
	confirmPostponeRegistration: string;
	confirmReopenRegistration: string;
	confirmResetSession: string;
	confirmRunLottery: string;
	confirmScheduleRegistration: string;
	currentSession: string;
	drawComplete: string;
	drawn: string;
	editSettings: string;
	error: string;
	extendRegistration: string;
	extendRegistrationMinutes: string;
	guestList: string;
	guestDatabase: string;
	historySessions: string;
	householdCount: string;
	lotteryActions: string;
	lotteryPending: string;
	lotteryPendingHelp: string;
	lotteryWeightHelp: string;
	lotteryWeightLabel: string;
	weightHigher: string;
	weightHighest: string;
	weightStandard: string;
	manualGuestTitle: string;
	markServed: string;
	markNoShow: string;
	returnToQueue: string;
	noActiveSession: string;
	noGuests: string;
	noRegisteredGuests: string;
	noHistory: string;
	noShow: string;
	notPlaced: string;
	open: string;
	openRegistration: string;
	openRegistrationNow: string;
	opensAt: string;
	overview: string;
	overridesHelp: string;
	questionPlaceholder: string;
	queuePosition: string;
	queue: string;
	callNext: string;
	callNextCount: string;
	waitingQueue: string;
	calledNow: string;
	resolvedGuests: string;
	noResolvedGuests: string;
	calledMinutesAgo: string;
	calledJustNow: string;
	/** The same two, short enough to sit beside a row's action button. */
	calledMinutesShort: string;
	calledJustNowShort: string;
	sessionActions: string;
	/** Short labels for the one-tap action on a queue row; the full verb lives in the menu. */
	callShort: string;
	serveShort: string;
	moreActions: string;
	phoneGuest: string;
	callFewer: string;
	callMore: string;
	noWaitingGuests: string;
	noCalledGuests: string;
	queueNotStarted: string;
	goToQueue: string;
	goToCurrentSession: string;
	queuePlacement: string;
	placeNext: string;
	placeEnd: string;
	confirmCloseSessionOutstanding: string;
	questionBank: string;
	questions: string;
	registered: string;
	registeredGuests: string;
	registrationDurationMinutes: string;
	registrationClosedHelp: string;
	registrationSettings: string;
	registrationOverrides: string;
	reopenRegistration: string;
	noAccess: string;
	forbidden: string;
	reports: string;
	reportsDescription: string;
	reportRangeFrom: string;
	reportRangeTo: string;
	reportRangeInvalid: string;
	reportDownloadCsv: string;
	reportExportVisits: string;
	reportExportVisitsHelp: string;
	reportPrivacyNote: string;
	reportEmpty: string;
	/** Keyed by the shared catalogue in `services/reports.ts` so a new report cannot ship untranslated. */
	reportNames: Record<ReportId, string>;
	reportDescriptions: Record<ReportId, string>;
	reportColumnLabels: Record<ReportColumnKey, string>;
	reportValueLabels: Record<ReportValueKey, string>;
	resetSession: string;
	resetSessionHelp: string;
	postponeByMinutes: string;
	postponeRegistration: string;
	remove: string;
	required: string;
	runLottery: string;
	saveGuest: string;
	saveSettings: string;
	saved: string;
	scheduleRegistration: string;
	scheduled: string;
	scheduledFor: string;
	scheduledSession: string;
	scheduledSessionHelp: string;
	serviceStarted: string;
	sessionUpdated: string;
	startSessionHelp: string;
	scaleAnswer: string;
	guestColumn: string;
	phoneColumn: string;
	householdColumn: string;
	languageColumn: string;
	statusColumn: string;
	actionsColumn: string;
	served: string;
	settingsHelp: string;
	sessionGuests: string;
	sessionType: string;
	textAnswer: string;
	updateCapacity: string;
	waiting: string;
	/** The dev-mode data loader: stages the current session at a chosen point on its lifecycle. */
	devMode: string;
	devModeIntro: string;
	devModeDisabled: string;
	devModeConfirm: string;
	devModeLoad: string;
	devModeLoaded: string;
	devStageDraftTitle: string;
	devStageDraftDescription: string;
	devStageScheduledTitle: string;
	devStageScheduledDescription: string;
	devStageRegistrationOpenTitle: string;
	devStageRegistrationOpenDescription: string;
	devStageRegistrationClosedTitle: string;
	devStageRegistrationClosedDescription: string;
	devStageLotteryPendingTitle: string;
	devStageLotteryPendingDescription: string;
	devStageServiceStartedTitle: string;
	devStageServiceStartedDescription: string;
	devStageEndedTitle: string;
	devStageEndedDescription: string;
	devProgressJustStarted: string;
	devProgressHalfway: string;
	devProgressNearlyDone: string;
}

/**
 * The admin dashboard's text. English only by product decision — see the localization section of
 * `CLAUDE.md`; only the guest-facing app is translated. Read it as `adminTranslations.en` rather
 * than by the app's current locale, which admin screens still receive for real work: formatting
 * dates and report cells, and naming a guest's own language out of `translations`.
 */
export const adminTranslations = {
	en: {
		adHocSession: 'Start when ready',
		adHocSessionHelp: 'Open registration immediately and choose when it closes.',
		addGuest: 'Add guest',
		addQuestion: 'Add question',
		adminEyebrow: 'Market team',
		admissionLabel: 'How should they join?',
		admissionLegend: 'Admission',
		admitAsServed: 'Record as already served',
		admitAsServedHelp:
			'For someone who was handed food outside the app. They join this session’s record without entering any line.',
		admitToLottery: 'Enter the draw',
		admitToLotteryHelp:
			'The guest takes their chances in the lottery, the same as anyone who signed up on their own phone.',
		admitToQueue: 'Give them a spot',
		admitToQueueHelp:
			'The guest skips the lottery and goes straight into the line. This uses one of the session’s spots.',
		adminDescription: 'Configure registration, draw the lottery, and manage today’s guests.',
		adminTitle: 'Market dashboard',
		allGuests: 'All guests',
		broadcastConfirm: 'Send this announcement to every subscribed guest in the current session?',
		broadcastHelp: 'The message will be sent exactly as written to all subscribed guests.',
		broadcastMessageLabel: 'Message',
		broadcastNoRecipients: 'No subscribed guests are available for this broadcast.',
		broadcastQueued: 'Broadcast queued for subscribed guests:',
		broadcastSend: 'Send broadcast',
		broadcastTitle: 'Broadcast notification',
		broadcastTitleLabel: 'Notification title',
		broadcastUnavailable:
			'Broadcast notifications are available once registration opens and until the session ends.',
		cancel: 'Cancel',
		capacity: 'Queue capacity',
		cancelled: 'Cancelled',
		callGuest: 'Call guest',
		closeSession: 'Close session',
		closeRegistration: 'Close registration',
		closed: 'Registration closed',
		closesAt: 'Registration closes',
		confirmCloseRegistration: 'Close registration now?',
		confirmCloseSession: 'Close this session and end service?',
		confirmOpenRegistration: 'Open registration for this session?',
		confirmPostponeRegistration: 'Postpone this scheduled registration?',
		confirmReopenRegistration: 'Reopen registration for this session?',
		confirmResetSession:
			'Reset this session? It will leave Current Session and remain available in session history.',
		confirmRunLottery: 'Run the lottery and start service?',
		confirmScheduleRegistration: 'Schedule registration for this time?',
		currentSession: 'Current session',
		drawComplete: 'Lottery draw complete.',
		drawn: 'Lottery drawn',
		editSettings: 'Lottery setup',
		error: 'Something went wrong. Please try again.',
		extendRegistration: 'Extend registration',
		extendRegistrationMinutes: 'Extend registration by (minutes)',
		guestList: 'Guest list',
		guestDatabase: 'Guest database',
		historySessions: 'Session history',
		householdCount: 'Household',
		lotteryActions: 'Lottery actions',
		lotteryPending: 'Lottery pending',
		lotteryPendingHelp: 'The registration pool is frozen. The lottery is ready to run.',
		lotteryWeightHelp:
			'Higher odds do not guarantee a spot — the guest can still miss out. Leave this at standard unless there is a reason to favour them.',
		lotteryWeightLabel: 'Chance in the draw',
		weightHigher: 'Higher priority',
		weightHighest: 'Highest priority',
		weightStandard: 'Standard',
		manualGuestTitle: 'Manually add a guest',
		markServed: 'Mark served',
		markNoShow: 'Mark no show',
		returnToQueue: 'Return to queue',
		noActiveSession: 'Registration inactive',
		noGuests: 'No guests found.',
		noRegisteredGuests: 'No guests have registered for this session yet.',
		noHistory: 'No past sessions yet.',
		noShow: 'No show',
		notPlaced: 'Not placed',
		open: 'Registration open',
		openRegistration: 'Open registration',
		openRegistrationNow: 'Open registration now',
		opensAt: 'Registration opens',
		overview: 'Today’s overview',
		overridesHelp: 'Extend the registration window or change queue capacity.',
		questionPlaceholder: 'Enter a question for guests',
		queuePosition: 'Queue position',
		queue: 'Queue',
		callNext: 'Call next',
		callNextCount: 'How many to call',
		waitingQueue: 'Waiting',
		calledNow: 'At the table',
		resolvedGuests: 'Finished',
		noResolvedGuests: 'Nobody has finished yet.',
		calledMinutesAgo: 'Called {minutes} min ago',
		calledJustNow: 'Called just now',
		calledMinutesShort: '{minutes} min',
		calledJustNowShort: 'Just now',
		sessionActions: 'Session actions',
		callShort: 'Call',
		serveShort: 'Served',
		moreActions: 'More actions',
		phoneGuest: 'Phone',
		callFewer: 'Call one fewer',
		callMore: 'Call one more',
		noWaitingGuests: 'Nobody is waiting to be called.',
		noCalledGuests: 'Nobody has been called up yet.',
		queueNotStarted: 'The queue opens once you run the lottery and service starts.',
		goToQueue: 'Manage the queue',
		goToCurrentSession: 'Go to the current session',
		queuePlacement: 'Place in the queue',
		placeNext: 'Next up',
		placeEnd: 'End of the queue',
		confirmCloseSessionOutstanding:
			'guests have not been served yet. Closing marks them as a no show. Close the session?',
		questionBank: 'Question bank',
		questions: 'Registration questions',
		registered: 'Registered',
		registeredGuests: 'Registered guests',
		registrationDurationMinutes: 'Registration open for (minutes)',
		registrationClosedHelp:
			'This step will advance automatically to Lottery pending in a few seconds.',
		registrationSettings: 'Registration settings',
		registrationOverrides: 'Registration overrides',
		reopenRegistration: 'Reopen registration',
		noAccess:
			'Your account does not have access to the admin area yet. Ask an administrator to give you a role.',
		forbidden: 'Your account does not have access to that.',
		reports: 'Reports',
		reportsDescription: 'See how sessions went, and pull the numbers a grant report asks for.',
		reportRangeFrom: 'From',
		reportRangeTo: 'To',
		reportRangeInvalid: 'Choose an end date on or after the start date.',
		reportDownloadCsv: 'Download CSV',
		reportExportVisits: 'Export every visit',
		reportExportVisitsHelp:
			'One row per guest per session, names and phone numbers included, for questions these reports do not answer. Open it in a spreadsheet.',
		reportPrivacyNote:
			'Reports count people without naming them. Only the full export identifies guests, so share that file carefully.',
		reportEmpty: 'No sessions in this date range.',
		reportNames: {
			'session-summary': 'Session summary',
			'people-served': 'People served by month',
			'guest-demographics': 'Who was served',
			'lottery-outcomes': 'Lottery outcomes by odds',
			'service-timing': 'Service timing',
		},
		reportDescriptions: {
			'session-summary':
				'One row per session: how many signed up, how many were served, and how full it ran.',
			'people-served':
				'Monthly totals for grant reporting. Guests and household members are counted once a month, however many times they came.',
			'guest-demographics':
				'Age, household size, and language of everyone served in the period, each guest counted once.',
			'lottery-outcomes':
				'How often guests at each weighting were placed in the line. Covers guests who signed up themselves and were entered in a draw.',
			'service-timing': 'How long guests waited between being called and being served.',
		},
		reportColumnLabels: {
			capacity: 'Capacity',
			category: 'Category',
			entries: 'Entries',
			fillRate: 'Filled',
			firstTime: 'First visit',
			guests: 'Guests',
			householdMembers: 'Household members',
			longestWait: 'Longest wait',
			medianWait: 'Median wait',
			month: 'Month',
			noShows: 'No shows',
			notPlaced: 'Not placed',
			placed: 'Placed',
			placementRate: 'Placed rate',
			served: 'Served',
			sessionDate: 'Session',
			sessions: 'Sessions',
			share: 'Share',
			signUps: 'Sign-ups',
			uniqueGuests: 'Unique guests',
			unrecorded: 'No timing',
			value: 'Group',
			walkIns: 'Added by a worker',
			weight: 'Odds',
		},
		reportValueLabels: {
			age: 'Age',
			household: 'Household size',
			language: 'Language',
		},
		resetSession: 'Reset session',
		resetSessionHelp:
			'Return to inactive setup. This session and its guest records will remain in history.',
		postponeByMinutes: 'Postpone by (minutes)',
		postponeRegistration: 'Postpone registration',
		remove: 'Remove',
		required: 'Required',
		runLottery: 'Run lottery draw',
		saveGuest: 'Save guest',
		saveSettings: 'Save settings',
		saved: 'Settings saved.',
		scheduleRegistration: 'Schedule registration',
		scheduled: 'Registration scheduled',
		scheduledFor: 'Registration will open',
		scheduledSession: 'Schedule for later',
		scheduledSessionHelp: 'Choose when registration opens and how long it remains open.',
		serviceStarted: 'Service started',
		sessionUpdated: 'Session updated.',
		startSessionHelp: 'Set up the next session, then open registration when you are ready.',
		scaleAnswer: '1–10 scale',
		guestColumn: 'Guest',
		phoneColumn: 'Phone',
		householdColumn: 'Household',
		languageColumn: 'Language',
		statusColumn: 'Status',
		actionsColumn: 'Actions',
		served: 'Served',
		settingsHelp: 'Set the window and maximum number of guests who receive a queue spot.',
		sessionGuests: 'Guests',
		sessionType: 'How should registration start?',
		textAnswer: 'Written answer',
		updateCapacity: 'Update capacity',
		waiting: 'Waiting',
		devMode: 'Dev Mode',
		devModeIntro:
			'Load fake guests and visits so the app looks like a real session at a chosen moment — for demos and screenshots. This replaces whatever session is currently live.',
		devModeDisabled: 'Demo data tools are not turned on for this deploy.',
		devModeConfirm: 'This replaces the current session with fake demo data. Continue?',
		devModeLoad: 'Load',
		devModeLoaded: 'Demo data loaded.',
		devStageDraftTitle: 'Draft',
		devStageDraftDescription: 'Settings saved, but nothing is public yet.',
		devStageScheduledTitle: 'Scheduled',
		devStageScheduledDescription: 'A registration window is set to open on its own.',
		devStageRegistrationOpenTitle: 'Registration open',
		devStageRegistrationOpenDescription: 'Guests are signing up right now.',
		devStageRegistrationClosedTitle: 'Registration closed',
		devStageRegistrationClosedDescription: 'Sign-ups are over, and the lottery has not run yet.',
		devStageLotteryPendingTitle: 'Lottery pending',
		devStageLotteryPendingDescription:
			'The grace period has ended and the registration pool is frozen for the draw.',
		devStageServiceStartedTitle: 'Service in progress',
		devStageServiceStartedDescription: 'The lottery has run and the queue is live.',
		devStageEndedTitle: 'Ended',
		devStageEndedDescription: 'The session is finished and moved to history.',
		devProgressJustStarted: 'Just started',
		devProgressHalfway: 'Halfway',
		devProgressNearlyDone: 'Nearly done',
	},
} satisfies Record<'en', AdminTranslation>;
