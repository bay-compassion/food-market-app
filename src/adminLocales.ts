import type { GuestFormCopy } from './locales.ts';
import type { MilestoneKind } from './models/session-milestones.ts';
import type { AdminView, AdminViewGroup } from './services/admin-views.ts';
import type { GuestDatabaseFilter } from './services/guest-database-filters.ts';
import type { ReportColumnKey, ReportId, ReportValueKey } from './services/reports.ts';
import type { VisitEventKind } from './services/visit-events.ts';

/** The Today screen's own copy. */
type TodayTranslations = {
	nothingToDoYet: string;
	/** `{date}` is the session's day. */
	opensByItself: string;
	closesByItself: string;
	leftToRegister: string;
	drawsByItself: string;
	drawResult: string;
	drawReady: string;
	drawManual: string;
	/** A worker's view of a draw run by hand, which they cannot run themselves. */
	drawWaiting: string;
	drawWaitingHelp: string;
	/** A worker's view of no session, which they cannot schedule themselves. */
	noSessionWorker: string;
	registered: string;
	spots: string;
	/** Names the timeline for a screen reader. */
	timelineLabel: string;
	/** Each step's name: in the past tense once it has happened, otherwise looking ahead. */
	milestones: Record<MilestoneKind, { done: string; next: string }>;
	afterTheDraw: string;
	whenYouRunIt: string;
	whenAdminRunsIt: string;
	now: string;
	beforeTheMarket: string;
	sessionOnSchedule: string;
	setUpRoomDisplay: string;
	setUpCheckIn: string;
	changeThePlan: string;
	postponeRegistration: string;
	extendRegistration: string;
	minutes: string;
	custom: string;
	customPostponeCurrent: string;
	customExtendCurrent: string;
	customPostponeMinutes: string;
	customExtendMinutes: string;
	customPostponeResult: string;
	customExtendResult: string;
	customPostponeAction: string;
	customExtendAction: string;
	extended: string;
	postponed: string;
	needMoreTime: string;
	everyoneIn: string;
	runNowHelp: string;
	sendBroadcast: string;
	endOfMarket: string;
	endOfMarketHelp: string;
	somethingWrong: string;
	keepServing: string;
	closeAndMarkNoShow: string;
	closeEndsService: string;
};

export interface AdminTranslation {
	householdService: {
		queueRecord: string;
		queueSaved: string;
		sectionTitle: string;
		queueHelp: string;
		entryActions: string;
		title: string;
		help: string;
		size: string;
		record: string;
		retrySave: string;
		saved: string;
		refresh: string;
		total: string;
		households: string;
		people: string;
		entries: string;
		correct: string;
		saveCorrection: string;
		cancel: string;
		undo: string;
		restore: string;
		voided: string;
		close: string;
		errors: Record<'load' | 'save' | 'correct', string>;
	};
	registrationOpenUntil: string;
	decreaseNumber: string;
	increaseNumber: string;
	transitionDue: string;
	pauseLottery: string;

	addGuest: string;
	addQuestion: string;
	admissionLabel: string;
	/** Heads the admin-only part of the manual guest form: how the guest enters the session. */
	admissionLegend: string;
	admitAsServed: string;
	admitAsServedHelp: string;
	admitProfileOnly: string;
	admitProfileOnlyHelp: string;
	admitToLottery: string;
	admitToLotteryHelp: string;
	admitToQueue: string;
	admitToQueueHelp: string;
	/** One line under each screen's title saying what the screen is for. */
	/** Today has none: its status card already says what the screen is for. */
	viewDescriptions: Record<Exclude<AdminView, 'current-session'>, string>;
	/** The Today screen, the admin's view of the current session. */
	today: TodayTranslations;
	/** The navigation's headings. */
	viewGroups: Record<AdminViewGroup, string>;
	/** The app bar menu's way out of the dashboard. */
	backToGuestView: string;
	/** The tab, and the sheet it opens, holding the screens with no tab of their own on a phone. */
	moreViews: string;
	/** The guest database's tab, where its full name does not fit. */
	guestsTab: string;
	/** A past session's status in the history list. */
	sessionClosed: string;
	/** A past session's one menu item: recording a guest served outside the app. */
	recordServedGuest: string;
	/** The guest-registration copy, reworded for a worker entering someone else's details. */
	manualGuestForm: GuestFormCopy;
	adminTitle: string;
	allGuests: string;
	/** Names the guest database's search field, which shows `searchGuestsPlaceholder` inside it. */
	searchGuests: string;
	searchGuestsPlaceholder: string;
	/** Names the row of quick filters over the guest database. */
	guestFilterLabel: string;
	guestFilters: Record<GuestDatabaseFilter, string>;
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
	confirmCloseRegistration: string;
	confirmCloseSession: string;
	/** The confirming button on a prompt whose question already says what will happen. */
	confirmContinue: string;
	confirmOpenRegistration: string;
	confirmPostponeRegistration: string;
	confirmReopenRegistration: string;
	confirmResetSession: string;
	/** What resetting leaves behind, spelled out under the question. */
	confirmResetSessionDetails: string;
	confirmRunLottery: string;
	currentSession: string;
	drawComplete: string;
	drawn: string;
	editSettings: string;
	error: string;
	extendRegistration: string;
	guestList: string;
	guestDatabase: string;
	/** Feedback after a manual add; `{name}` is the guest's full name. */
	guestAdded: string;
	guestClaimClose: string;
	/** Asked before a manager shows a code from a guest's Actions menu. `{name}` is their name. */
	guestClaimConfirm: string;
	/**
	 * The check that question exists for, shown under it: `{name}` is the guest's full name and
	 * `{phone}` the number on file, for confirming who is actually at the desk.
	 */
	guestClaimConfirmIdentity: string;
	/** Also under it: what showing the code costs a guest already using another phone. */
	guestClaimConfirmReplacesPhone: string;
	guestClaimDone: string;
	guestClaimImageAlt: string;
	/** `{name}` is the guest's full name and `{time}` the moment the code stops working. */
	guestClaimInstructions: string;
	/** Why a worker was refused a code: the guest was not just added, or is already on a phone. */
	guestClaimRefused: string;
	/** Shown with a code that will take the record away from the guest's current phone. */
	guestClaimReplacesDevice: string;
	guestClaimShow: string;
	guestClaimTitle: string;
	/** The guest's actions-menu item that opens the permanent-deletion dialog. */
	guestDeleteShow: string;
	guestDeleteTitle: string;
	guestDeleteClose: string;
	/** `{date}` is when the guest signed up, `{digits}` the last four digits of their phone. */
	guestDeleteIdentity: string;
	guestDeleteRemoves: string;
	/** `{count}` is how many visits the guest has on record. */
	guestDeleteVisits: string;
	guestDeleteVisitHistory: string;
	guestDeleteTextConsent: string;
	guestDeleteIrreversible: string;
	guestDeleteOutsideApp: string;
	guestDeleteInOpenSession: string;
	guestDeletePhoneLabel: string;
	guestDeletePhoneHint: string;
	guestDeleteConfirm: string;
	/** `{name}` is the guest who was deleted. */
	guestDeleted: string;
	historySessions: string;
	householdCount: string;
	lotteryActions: string;
	/** The folded timeline's summary, for one completed step and for several (`{count}`). */
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
	noCancelledGuests: string;
	noHistory: string;
	schedule: string;
	scheduleIntro: string;
	scheduleCalendarLabel: string;
	scheduleGridLabel: string;
	scheduleDateColumn: string;
	scheduleRegistrationColumn: string;
	scheduleLotteryColumn: string;
	scheduleNoRows: string;
	scheduleNothingOnDate: string;
	scheduleShowingDate: string;
	scheduleClearDate: string;
	scheduleAddPattern: string;
	scheduleAddOneOff: string;
	scheduleOneOffBlockedActive: string;
	scheduleOneOffBlockedPending: string;
	scheduleEdit: string;
	scheduleDelete: string;
	scheduleStartNow: string;
	scheduleCreateNext: string;
	scheduleGoToSession: string;
	schedulePatternDialogTitle: string;
	scheduleSessionDialogTitle: string;
	scheduleOneOffDialogTitle: string;
	scheduleStartsOn: string;
	scheduleDate: string;
	scheduleOpensAt: string;
	scheduleDuration: string;
	scheduleLotteryDelay: string;
	scheduleLotteryDelayHelp: string;
	scheduleAutoClose: string;
	scheduleAutoCloseHelp: string;
	scheduleLotteryManual: string;
	scheduleAutoCloseNever: string;
	scheduleClearLotteryDelay: string;
	scheduleClearAutoClose: string;
	scheduleDecrease: string;
	scheduleIncrease: string;
	scheduleSave: string;
	scheduleLoadError: string;
	scheduleConfirmDeletePattern: string;
	scheduleConfirmDeletePatternDetails: string;
	scheduleConfirmReplacePending: string;
	scheduleConfirmReplacePendingDetails: string;
	scheduleConfirmReplaceWithOneOff: string;
	scheduleConfirmReplaceWithOneOffDetails: string;
	scheduleConfirmDeleteSession: string;
	scheduleConfirmStartNow: string;
	scheduleConfirmStartNowDetails: string;
	scheduleConfirmCreateNext: string;
	scheduleOpenSchedule: string;
	lotteryDrawsAt: string;
	postponeLotteryBy: string;
	runLotteryNow: string;
	questionBankNeedsPattern: string;
	noSession: string;
	noSessionHelp: string;
	noShow: string;
	/** The guest database status of a guest who has never had a visit. */
	noVisit: string;
	notPlaced: string;
	/** Names the total the progress bar measures against, as "of 120 guests placed today". */
	placedToday: string;
	open: string;
	openRegistrationNow: string;
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
	/**
	 * Added under `confirmCloseSession` when guests are still waiting; `{count}` is how many
	 * closing would mark as a no show.
	 */
	confirmCloseSessionOutstanding: string;
	questionBank: string;
	questions: string;
	registered: string;
	registeredGuests: string;
	registrationClosedHelp: string;
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
	scheduled: string;
	serviceStarted: string;
	sessionUpdated: string;
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
	textAnswer: string;
	updateCapacity: string;
	waiting: string;
	/** The dev-mode data loader: stages the current session at a chosen point on its lifecycle. */
	devMode: string;
	devModeIntro: string;
	devModeDisabled: string;
	devModeConfirm: string;
	/** What loading demo data costs, spelled out under the question. */
	devModeConfirmDetails: string;
	devModeLoad: string;
	devModeLoaded: string;
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
	queueDesk: QueueDeskTranslation;
	kioskUnlock: KioskUnlockTranslation;
	printStationCard: PrintStationCardTranslation;
	checklist: ChecklistTranslation;
}

/** One step on the Checklist: a short instruction, and a line on how or where. */
export interface ChecklistStepCopy {
	/** Stable across rewording, since a device's ticks are stored against it. */
	id: string;
	title: string;
	detail?: string;
}

/** The Checklist screen: what has to be done by hand, outside the app, before a session. */
export interface ChecklistTranslation {
	title: string;
	/** Under the title: what the screen is for and how to work through it. */
	intro: string;
	/** On a station's card: `{done}` of `{total}` steps ticked. */
	progress: string;
	/** On a station's card once every step is ticked, in place of the count. */
	complete: string;
	/** Leads each station's "what finished looks like" line. */
	doneWhen: string;
	showSteps: string;
	hideSteps: string;
	/** Next to a step the app ticks for itself. */
	automatic: string;
	/** While there is no session, ticks have nothing to belong to. */
	ticksNeedSession: string;
	/** The plan of the market's part of the building, shown before the stations. */
	floorPlan: {
		title: string;
		alt: string;
		zoomIn: string;
		zoomOut: string;
		reset: string;
	};
	roomDisplay: {
		title: string;
		/** Where at the market this station is set up. */
		place: string;
		/** The plan cropped to this station's mark. */
		closeUpAlt: string;
		/** Each step, in order. */
		steps: ChecklistStepCopy[];
		/** Where the Mac mini's power button and the keyboard's switch are. */
		hardware: {
			alt: string;
			macMini: string;
			keyboard: string;
		};
		addressLabel: string;
		unlockHint: string;
		getCode: string;
		/** In place of the button, for a worker who can't ask for a code. */
		askForCode: string;
		/** Under the address: a link to the troubleshooting fix for the old Mac mini's certificate warning. */
		certificateHelp: string;
		/** The line board's own full-screen button, drawn beside the step. */
		fullScreenButtonAlt: string;
		doneWhen: string;
	};
	checkIn: {
		title: string;
		place: string;
		closeUpAlt: string;
		placeTitle: string;
		/** Putting the cabinet in place, before anything on it is turned on. */
		placeSteps: ChecklistStepCopy[];
		/** After the printing station is running: the queue desk, in a window of its own. */
		queueDeskTitle: string;
		/** Shown until the printing station is online, since starting it closes Chrome. */
		queueDeskWait: string;
		queueDeskSteps: ChecklistStepCopy[];
		queueDeskAddressLabel: string;
		openQueueDesk: string;
		doneWhen: string;
	};
	session: {
		/** `{opens}` is when registration opens, `{capacity}` how many guests it admits. */
		scheduledTitle: string;
		scheduled: string;
		/** The session has already started its day: registration is open or past it. */
		underway: string;
		missingTitle: string;
		missing: string;
		openSchedule: string;
	};
	/** Below the stations: what is needed only when something goes wrong, or on a new computer. */
	reference: {
		title: string;
		troubleshootingTitle: string;
		/** Starting the printing station from Terminal, when the iMac's automation doesn't. */
		byHandTitle: string;
		byHandIntro: string;
		setupTitle: string;
		setupIntro: string;
		/** The room display's Mac mini, which needs one setting of its own. */
		macMiniTitle: string;
		macMiniIntro: string;
		macMiniSteps: string[];
	};
}

/** The Checklist's printing station steps, on the check-in computer at the market. */
export interface PrintStationCardTranslation {
	title: string;
	online: string;
	offline: string;
	/** Which account signs in on the station, and why it isn't your own. */
	account: string;
	/** What to do on every market day, in order. */
	steps: ChecklistStepCopy[];
	commandLabel: string;
	/** For someone who has never opened Terminal; under each command. */
	runCommandTitle: string;
	runCommandSteps: string[];
	copy: string;
	copied: string;
	copyFailed: string;
	/** Under the market-day command: opening the station without it. */
	openInstead: string;
	open: string;
	/**
	 * `id` names a problem a step links to, so the link can open it; `{host}` in a fix is the app's
	 * own address.
	 */
	troubleshooting: { id?: string; problem: string; fix: string }[];
	/** Done once per computer, grouped by what each part sets up. */
	setupTitle: string;
	setupGroups: { title: string; steps: string[] }[];
	setupCommandLabel: string;
	guide: string;
}

/** The code a worker reads off their phone to unlock a room display at `/kiosk`. */
export interface KioskUnlockTranslation {
	/** The menu item that asks for a code. */
	open: string;
	title: string;
	/** Above the room display's web address. */
	goTo: string;
	/** Above the code, after the address. */
	typeCode: string;
	/** Under the code. `{time}` is when it stops working. */
	instructions: string;
	/** Replaces the instructions once the code has lapsed with the dialog still open. */
	expired: string;
	newCode: string;
	done: string;
	failed: string;
	/** The locked room display itself: a gate in front of the board, so English only. */
	display: {
		locked: string;
		/** Labels the field the six-digit code from a worker's phone goes into. */
		codeLabel: string;
		unlock: string;
		wrongCode: string;
		/** The code could not be checked: the network or the server. */
		unlockFailed: string;
	};
}

/** The `/queue` screen a volunteer runs the line from on their own phone. */
export interface QueueDeskTranslation {
	title: string;
	/** The line under the title while service is running. */
	serving: string;
	loading: string;
	notPermitted: string;
	ended: string;
	openDashboard: string;
	/** Links the dashboard's queue tab to the volunteer screen. */
	openQueueDesk: string;
	actions: string;
	called: string;
	waiting: string;
	noShows: string;
	notPlaced: string;
	done: string;
	noneCalled: string;
	noneWaiting: string;
	noneDone: string;
	callNext: string;
	/** Serves the open ticket's guest and calls the next one, in one tap. */
	serveAndCallNext: string;
	/** The default way back into the line: behind everyone waiting. */
	returnToBack: string;
	returnToFront: string;
	/** Names the arrow beside "return to back" that opens the other places. */
	returnOptions: string;
	addGuest: string;
	/** Names the menu beside the call button on a phone. */
	lineActions: string;
	/** `{number}` is the queue position, `{name}` the guest's full name. */
	openTicket: string;
	ticket: string;
	/** In the desk layout's ticket pane, while no ticket is open. */
	noTicketOpen: string;
	unplaced: string;
	closeTicket: string;
	nameTag: string;
	/** Names the pronunciation line on a name tag. */
	pronunciation: string;
	/** Before the name tag's reference code, the tail of the visit id that ties it to the visit. */
	reference: string;
	/** Names the reference code for a screen reader and on hover. */
	referenceHelp: string;
	printNameTag: string;
	/** Under the print button: where the tag will come out. */
	printsAtStation: string;
	printStationIsOffline: string;
	printSent: string;
	printStationOffline: string;
	printFailed: string;
	printStation: PrintStationTranslation;
	language: string;
	/** `{count}` is the number of people in the household. */
	household: string;
	/** How long ago a guest was called, short enough for a chip. `{minutes}` is a whole number. */
	elapsedMinutes: string;
	elapsedJustNow: string;
	history: VisitHistoryTranslation;
	guestDetails: GuestDetailsTranslation;
}

/** The open ticket's editor for how to say a guest's name and what staff note about them. */
export interface GuestDetailsTranslation {
	title: string;
	pronunciation: string;
	pronunciationHelp: string;
	staffNotes: string;
	/** Under the notes: who can read them. */
	staffNotesHelp: string;
	save: string;
	saving: string;
	saved: string;
	saveFailed: string;
}

/** The `/printing-station` page an unattended desktop runs to print tags sent from phones. */
export interface PrintStationTranslation {
	title: string;
	loading: string;
	ready: string;
	/** `{time}` is when the station last reached the server. */
	checkedAt: string;
	reconnecting: string;
	signInRequired: string;
	signIn: string;
	notPermitted: string;
	recent: string;
	noneYet: string;
	keepOpen: string;
	setupTitle: string;
	setup: string;
}

/** The History panel on an open ticket: what happened to the visit, by whom, and when. */
export interface VisitHistoryTranslation {
	title: string;
	empty: string;
	kinds: Record<VisitEventKind, string>;
	/** Appended to `returned`, saying where in line the guest went. */
	returnedToBack: string;
	returnedToFront: string;
	/** `{name}` is the worker's name. */
	byWorker: string;
	/** A worker whose sign-in did not carry a name. */
	byUnnamedWorker: string;
	byGuest: string;
	byLottery: string;
	bySessionEnding: string;
	bySystem: string;
}

/**
 * The admin dashboard's text. English only by product decision — see the localization section of
 * `CLAUDE.md`; only the guest-facing app is translated. Read it as `adminTranslations.en` rather
 * than by the app's current locale, which admin screens still receive for real work: formatting
 * dates and report cells, and naming a guest's own language out of `translations`.
 */
export const adminTranslations = {
	en: {
		registrationOpenUntil: 'Registration open until',
		decreaseNumber: 'Decrease value',
		increaseNumber: 'Increase value',
		transitionDue: 'Waiting for the server to transition…',
		pauseLottery: 'Pause Automatic Draw',
		addGuest: 'Add Guest',
		addQuestion: 'Add question',
		admissionLabel: 'How should they join?',
		admissionLegend: 'Admission',
		admitAsServed: 'Record as already served',
		admitAsServedHelp:
			'For someone who was handed food outside the app. They join this session’s record without entering any line.',
		admitProfileOnly: 'Just save their details',
		admitProfileOnlyHelp:
			'Adds the guest without entering them in any session. They can register themselves next time — show them the QR code so their phone remembers them.',
		admitToLottery: 'Enter the draw',
		admitToLotteryHelp:
			'The guest takes their chances in the lottery, the same as anyone who signed up on their own phone.',
		admitToQueue: 'Give them a spot',
		admitToQueueHelp:
			'The guest skips the lottery and goes straight into the line. This uses one of the session’s spots.',
		today: {
			nothingToDoYet: 'Nothing to do yet',
			opensByItself: 'Registration opens by itself on {date}.',
			closesByItself: 'Closes by itself at {time}',
			leftToRegister: 'Left to register. The draw follows on its own.',
			drawsByItself: 'Draws by itself at {time}',
			drawResult:
				'{registered} registered for {capacity} spots. Guests hear the result as soon as it runs.',
			drawReady: 'Ready to Run',
			drawWaiting: 'Not Run Yet',
			drawWaitingHelp: '{registered} registered for {capacity} spots. An admin runs the draw.',
			noSessionWorker: 'There is no session right now.',
			drawManual:
				'{registered} registered for {capacity} spots. Nothing happens until you run the draw.',
			registered: 'Registered',
			spots: 'Spots in This Session',
			timelineLabel: 'Today’s timeline',
			milestones: {
				registration_opens: { done: 'Registration Opened', next: 'Registration Opens' },
				registration_closes: { done: 'Registration Closed', next: 'Registration Closes' },
				lottery_draw: { done: 'Lottery Drawn', next: 'Lottery Draw' },
				service_starts: { done: 'Service Started', next: 'Service Starts' },
			},
			afterTheDraw: 'After the Draw',
			whenYouRunIt: 'When You Run It',
			whenAdminRunsIt: 'When an Admin Runs It',
			now: 'Now',
			beforeTheMarket: 'Before the Market',
			sessionOnSchedule: 'Session Is on the Schedule',
			setUpRoomDisplay: 'Set Up the Room Display',
			setUpCheckIn: 'Set Up the Check-In Computer',
			changeThePlan: 'Change the Plan',
			postponeRegistration: 'Postpone Registration',
			extendRegistration: 'Extend Registration',
			minutes: '{minutes} Min',
			custom: 'Custom',
			customPostponeCurrent: 'Registration opens at {time}.',
			customExtendCurrent: 'Registration closes at {time}.',
			customPostponeMinutes: 'Minutes to Postpone',
			customExtendMinutes: 'Minutes to Add',
			customPostponeResult: 'New opening time: {time}',
			customExtendResult: 'New closing time: {time}',
			customPostponeAction: 'Postpone to {time}',
			customExtendAction: 'Extend to {time}',
			extended: 'Registration now closes at {time}.',
			postponed: 'Registration now opens at {time}.',
			needMoreTime: 'Need More Time?',
			everyoneIn: 'Everyone Is In?',
			runNowHelp: 'Run it now instead of waiting. This can’t be undone.',
			sendBroadcast: 'Send Broadcast',
			endOfMarket: 'End of the Market',
			endOfMarketHelp: 'Ends service and sets up the next session from the schedule.',
			somethingWrong: 'Something Went Wrong?',
			keepServing: 'Keep Serving',
			closeAndMarkNoShow: 'Close Session and Mark {count} No Show',
			closeEndsService:
				'Service ends and the queue closes. The next session is set up from the schedule.',
		},
		viewDescriptions: {
			checklist: 'What to set up at the market by hand before a session begins.',
			queue: 'Call guests forward and record who has been served.',
			broadcast: 'Send one message to every guest who turned on notifications.',
			schedule: 'Set when the market runs and add one-off sessions.',
			'question-bank': 'The questions a session can ask guests when they register.',
			'guest-database': 'Everyone who has registered or been added by staff.',
			'session-history': 'Past sessions, and guests served outside the app.',
			workers: 'Add staff and manage worker and admin access.',
			reports: 'Basic figures for a date range. Export a CSV for anything more.',
			'dev-mode': 'Load demo guests and visits to show the app at a chosen moment.',
		},
		viewGroups: {
			today: 'Today',
			plan: 'Plan',
			records: 'Records',
		},
		backToGuestView: 'Back to Guest View',
		moreViews: 'More',
		guestsTab: 'Guests',
		sessionClosed: 'Closed',
		recordServedGuest: 'Record a Served Guest',
		manualGuestForm: {
			informationLegend: 'Guest Details',
			pronunciationOffer: 'Add how to say their name',
			pronunciationHelp: 'Write it the way it sounds, so whoever calls it says it correctly.',
			pronunciationCollapse: 'Hide how to say their name',
			lotteryLegend: 'Household',
			agePlaceholder: 'Select their age range',
			household: 'Number of people in their household',
			householdHint: 'Including the guest',
			childrenCount: 'Number of children they’re shopping for',
			seniorsCount: 'Number of seniors (55+) they’re shopping for',
			seniorsHint: 'Including the guest, if they’re 55 or older',
			exceedsHousehold:
				'Children and seniors together can’t be more than the people in their household.',
			noAdult: 'Their household must include at least one adult.',
			initialsOnly: 'Write out the whole name, not just the first letter.',
		},
		adminTitle: 'Market Dashboard',
		allGuests: 'All guests',
		searchGuests: 'Search guests',
		searchGuestsPlaceholder: 'Name or phone number',
		guestFilterLabel: 'Show',
		guestFilters: {
			all: 'All',
			'in-session': 'In Today’s Session',
			'not-placed': 'Not Placed',
		},
		broadcastConfirm: 'Send this announcement to every subscribed guest in the current session?',
		broadcastHelp: 'The message will be sent exactly as written to all subscribed guests.',
		broadcastMessageLabel: 'Message',
		broadcastNoRecipients: 'No subscribed guests are available for this broadcast.',
		broadcastQueued: 'Broadcast queued for subscribed guests:',
		broadcastSend: 'Send Broadcast',
		broadcastTitle: 'Broadcast Notification',
		broadcastTitleLabel: 'Notification title',
		broadcastUnavailable:
			'Broadcast notifications are available once registration opens and until the session ends.',
		cancel: 'Cancel',
		capacity: 'Queue capacity',
		cancelled: 'Cancelled',
		callGuest: 'Call guest',
		closeSession: 'Close Session',
		closeRegistration: 'Close Early',
		closed: 'Registration closed',
		confirmCloseRegistration: 'Close registration now?',
		confirmContinue: 'Continue',
		confirmCloseSession: 'Close this session and end service?',
		confirmOpenRegistration: 'Open registration for this session?',
		confirmPostponeRegistration: 'Postpone this scheduled registration?',
		confirmReopenRegistration: 'Reopen registration for this session?',
		confirmResetSession: 'Reset this session?',
		confirmResetSessionDetails:
			'It stays in session history, but unlike closing, this does not set up the next session.',
		confirmRunLottery: 'Run the lottery and start service?',
		currentSession: 'Today',
		drawComplete: 'Lottery draw complete.',
		drawn: 'Lottery drawn',
		editSettings: 'Lottery setup',
		error: 'Something went wrong. Please try again.',
		extendRegistration: 'Extend',
		guestList: 'Guest list',
		guestDatabase: 'Guest Database',
		guestAdded: '{name} was added.',
		guestClaimClose: 'Close QR code',
		guestClaimConfirm: "Show a QR code that puts {name}'s record on a phone?",
		guestClaimConfirmIdentity:
			"First check you're speaking to {name}: ask them to confirm the phone number on file, {phone}.",
		guestClaimConfirmReplacesPhone:
			'If they already use the app on another phone, that phone is signed out once this code is scanned.',
		guestClaimDone: 'Done',
		guestClaimImageAlt: 'QR code that sets up this guest on their phone',
		guestClaimInstructions:
			"Ask {name} to scan this with their phone's camera so their phone can show their status and updates. The code works once, until {time}.",
		guestClaimRefused: 'Only a manager can set up a phone for this guest now.',
		guestClaimReplacesDevice:
			'{name} already uses the app on another phone. Once this is scanned, that phone is signed out and this one takes over their record.',
		guestClaimShow: 'Show QR Code for Their Phone',
		guestClaimTitle: 'Set up their phone',
		guestDeleteShow: 'Delete Guest Permanently',
		guestDeleteTitle: 'Delete Guest Permanently',
		guestDeleteClose: 'Close without deleting',
		guestDeleteIdentity: 'Signed up {date} · phone ending in {digits}',
		guestDeleteRemoves: 'This removes everything the app stores about them:',
		guestDeleteVisits: '{count} visits, with their household details and question answers',
		guestDeleteVisitHistory: 'Each visit’s history, and the text and push messages sent about it',
		guestDeleteTextConsent: 'Their text-message consent and opt-outs',
		guestDeleteIrreversible:
			'This cannot be undone. Past reports will count fewer guests and visits for every period they attended.',
		guestDeleteOutsideApp:
			'Copies outside the app — exported spreadsheets, paper sign-in sheets — need deleting separately.',
		guestDeleteInOpenSession:
			'This guest is in a session that has not ended. Delete them once the session ends.',
		guestDeletePhoneLabel: 'Type their phone number to confirm',
		guestDeletePhoneHint: 'The number on file, which you confirmed with the guest.',
		guestDeleteConfirm: 'Delete Permanently',
		guestDeleted: '{name} was deleted permanently.',
		historySessions: 'Session History',
		householdCount: 'Household',
		lotteryActions: 'Lottery Draw',
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
		noCancelledGuests: 'Nobody has cancelled their registration.',
		noRegisteredGuests: 'No guests have registered for this session yet.',
		noHistory: 'No past sessions yet.',
		schedule: 'Schedule',
		scheduleIntro:
			'Sessions repeat from the recurring pattern. When a session ends, the next one is created automatically.',
		scheduleCalendarLabel: 'Schedule calendar',
		scheduleGridLabel: 'Upcoming sessions',
		scheduleDateColumn: 'Date',
		scheduleRegistrationColumn: 'Registration',
		scheduleLotteryColumn: 'Lottery',
		scheduleNoRows: 'Nothing is scheduled. Add a recurring pattern or a one-off session.',
		scheduleNothingOnDate: 'Nothing is scheduled on this date.',
		scheduleShowingDate: 'Showing {date}',
		scheduleClearDate: 'Show all',
		scheduleAddPattern: 'Add Recurring',
		scheduleAddOneOff: 'Add One-Off',
		scheduleOneOffBlockedActive: 'A session is running. Add a one-off session once it ends.',
		scheduleOneOffBlockedPending:
			'A one-off session is already pending, or someone has joined the next session.',
		scheduleEdit: 'Edit',
		scheduleDelete: 'Delete',
		scheduleStartNow: 'Start Now',
		scheduleCreateNext: 'Create next session',
		scheduleGoToSession: 'Go to session',
		schedulePatternDialogTitle: 'Recurring pattern',
		scheduleSessionDialogTitle: 'Edit session',
		scheduleOneOffDialogTitle: 'One-off session',
		scheduleStartsOn: 'First date (repeats weekly on this day)',
		scheduleDate: 'Date',
		scheduleOpensAt: 'Registration opens',
		scheduleDuration: 'Registration open for (minutes)',
		scheduleLotteryDelay: 'Draw the lottery automatically (minutes after registration closes)',
		scheduleLotteryDelayHelp: 'Clear it to draw the lottery by hand.',
		scheduleAutoClose: 'Close the session automatically (hours after registration opens)',
		scheduleAutoCloseHelp: 'Clear it to never close the session automatically.',
		scheduleLotteryManual: 'By hand',
		scheduleAutoCloseNever: 'Never',
		scheduleClearLotteryDelay: 'Clear the automatic lottery draw',
		scheduleClearAutoClose: 'Clear the automatic close',
		scheduleDecrease: 'Decrease',
		scheduleIncrease: 'Increase',
		scheduleSave: 'Save',
		scheduleLoadError: 'The schedule could not be loaded.',
		scheduleConfirmDeletePattern: 'Delete the recurring pattern?',
		scheduleConfirmDeletePatternDetails:
			'Its next session is removed too, unless someone has joined it. Past sessions are kept.',
		scheduleConfirmReplacePending: 'Save the pattern and recreate the next session?',
		scheduleConfirmReplacePendingDetails: 'Any changes made to the next session are discarded.',
		scheduleConfirmReplaceWithOneOff:
			'Add this one-off session in place of the next scheduled session?',
		scheduleConfirmReplaceWithOneOffDetails:
			'The recurring pattern creates its next session again when the one-off session ends.',
		scheduleConfirmDeleteSession: 'Delete this one-off session?',
		scheduleConfirmStartNow: 'Open registration for this session now?',
		scheduleConfirmStartNowDetails:
			'Guests can register immediately, and the session closes automatically on its usual schedule from now.',
		scheduleConfirmCreateNext: 'Create the next session from the recurring pattern?',
		scheduleOpenSchedule: 'Go to Schedule',
		lotteryDrawsAt: 'The lottery draws automatically at {time}.',
		postponeLotteryBy: 'Postpone {minutes} Min',
		runLotteryNow: 'Run Immediately',
		questionBankNeedsPattern:
			'Add a recurring pattern on the Schedule tab to set the questions its sessions ask.',
		noSession: 'No session',
		noSessionHelp: 'There is no session right now. Sessions are created on the Schedule tab.',
		noShow: 'No show',
		noVisit: 'No visit',
		notPlaced: 'Not placed',
		placedToday: 'of {count} guests placed today',
		open: 'Registration open',
		openRegistrationNow: 'Open Early',
		overview: 'Today’s overview',
		overridesHelp: 'Extend the registration window or change queue capacity.',
		questionPlaceholder: 'Enter a question for guests',
		queuePosition: 'Queue position',
		queue: 'Queue',
		callNext: 'Call Next',
		callNextCount: 'How many to call',
		waitingQueue: 'Waiting',
		calledNow: 'At check-in',
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
		goToQueue: 'Go to the Queue',
		goToCurrentSession: 'Go to Today',
		queuePlacement: 'Place in the queue',
		placeNext: 'Next up',
		placeEnd: 'End of the queue',
		confirmCloseSessionOutstanding:
			'{count} guests have not been served yet. Closing marks them as a no show.',
		questionBank: 'Question Bank',
		questions: 'Registration questions',
		registered: 'Registered',
		registeredGuests: 'Registered guests',
		registrationClosedHelp:
			'This step will advance automatically to Lottery pending in a few seconds.',
		registrationOverrides: 'Registration overrides',
		reopenRegistration: 'Reopen Registration',
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
		householdService: {
			queueRecord: 'Record',
			queueSaved: 'Household recorded.',
			sectionTitle: 'Count-only',
			queueHelp:
				'Record completed shopping outside the queue. Do not count guests already marked Done.',
			entryActions: 'Household actions',
			title: 'Record household served',
			help: 'Record completed shopping only. Do not add a household already marked served in the queue. No name or phone number is collected.',
			size: 'Household size',
			record: 'Record household',
			retrySave: 'Retry this save',
			saved: 'Household recorded. Ready for the next household.',
			refresh: 'Refresh entries',
			total: 'Count-only total',
			households: 'households',
			people: 'people',
			entries: 'Recorded households, newest first',
			correct: 'Correct size',
			saveCorrection: 'Save correction',
			cancel: 'Cancel',
			undo: 'Undo entry',
			restore: 'Restore entry',
			voided: 'Undone',
			close: 'Close',
			errors: {
				load: 'Entries could not be loaded. Refresh to try again.',
				save: 'The save could not be confirmed. Retry this save before recording another household; it will not be counted twice.',
				correct: 'The correction could not be confirmed. Refresh entries before trying again.',
			},
		},
		reportNames: {
			'session-summary': 'Session Summary',
			'people-served': 'People Served by Month',
			'guest-demographics': 'Who Was Served',
			'lottery-outcomes': 'Lottery Outcomes by Odds',
			'service-timing': 'Service Timing',
		},
		reportDescriptions: {
			'session-summary':
				'One row per session: how many signed up, how many were served, and how full it ran.',
			'people-served':
				'Service totals include count-only households. People served sums household sizes at every shopping visit, including repeats. Unique guests and monthly unique household members cover identified visits only; count-only households cannot be deduplicated.',
			'guest-demographics':
				'Age, household size, and language of identified guests served in the period, each guest counted once. Excludes count-only households.',
			'lottery-outcomes':
				'How often guests at each weighting were placed in the line. Covers guests who signed up themselves and were entered in a draw.',
			'service-timing':
				'How long identified guests waited between being called and being served. Excludes count-only households.',
		},
		reportColumnLabels: {
			countOnlyHouseholds: 'Count-only households',
			countOnlyMembers: 'Count-only people served (with repeats)',
			peopleServings: 'People served (with repeats)',
			capacity: 'Capacity',
			category: 'Category',
			entries: 'Entries',
			fillRate: 'Filled',
			firstTime: 'First visit',
			guests: 'Guests',
			householdMembers: 'Identified household members (monthly unique)',
			longestWait: 'Longest wait',
			medianWait: 'Median wait',
			month: 'Month',
			noShows: 'No shows',
			notPlaced: 'Not placed',
			placed: 'Placed',
			placementRate: 'Placed rate',
			served: 'Households served',
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
		resetSession: 'Reset Session',
		resetSessionHelp:
			'Ends this session without setting up the next one. It and its guest records stay in history.',
		postponeByMinutes: 'Postpone by (minutes)',
		postponeRegistration: 'Postpone',
		remove: 'Remove',
		required: 'Required',
		runLottery: 'Run Lottery Draw',
		saveGuest: 'Save Guest',
		saveSettings: 'Save Settings',
		saved: 'Settings saved.',
		scheduled: 'Registration scheduled',
		serviceStarted: 'Service started',
		sessionUpdated: 'Session updated.',
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
		textAnswer: 'Written answer',
		updateCapacity: 'Update',
		waiting: 'Waiting',
		devMode: 'Dev Mode',
		devModeIntro:
			'Load fake guests and visits so the app looks like a real session at a chosen moment — for demos and screenshots. This replaces whatever session is currently live.',
		devModeDisabled: 'Demo data tools are not turned on for this deploy.',
		devModeConfirm: 'Load demo data?',
		devModeConfirmDetails: 'This replaces the current session with fake demo data.',
		devModeLoad: 'Load',
		devModeLoaded: 'Demo data loaded.',
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
		queueDesk: {
			lineActions: 'More Line Actions',
			title: 'Queue',
			serving: 'Serving guests',
			loading: 'Loading the queue…',
			notPermitted: 'This account can’t run the queue. Ask an admin to give it the worker role.',
			ended: 'Today’s session has ended.',
			openDashboard: 'Open the admin dashboard',
			openQueueDesk: 'Open the queue screen',
			actions: 'Queue actions',
			called: 'Called',
			waiting: 'Waiting',
			noShows: 'No-shows',
			notPlaced: 'Not placed',
			done: 'Done',
			noneCalled: 'Nobody has been called yet.',
			noneWaiting: 'Nobody is left in line.',
			noneDone: 'Nobody has finished yet.',
			callNext: 'Call next',
			serveAndCallNext: 'Serve and call next',
			returnToBack: 'Return to back of line',
			returnToFront: 'Return to front of line',
			returnOptions: 'Other places in line',
			addGuest: 'Add Guest',
			openTicket: 'Open ticket {number}, {name}',
			ticket: 'Ticket',
			noTicketOpen: 'Choose a ticket, or call the next guest.',
			unplaced: 'Not placed',
			closeTicket: 'Close ticket',
			nameTag: 'Name tag',
			pronunciation: 'Pronunciation',
			reference: 'Ref',
			referenceHelp: 'Reference code: the end of the visit ID',
			printNameTag: 'Print name tag',
			printsAtStation: 'Prints at the print station',
			printStationIsOffline: 'The print station is offline',
			printSent: 'Name tag sent to the printer.',
			printStationOffline:
				'The print station went offline, so the tag wasn’t printed. Check the market’s computer.',
			printFailed: 'The name tag couldn’t be sent. Try again.',
			printStation: {
				title: 'Print station',
				loading: 'Starting the print station…',
				ready: 'Ready. Name tags sent from volunteers’ phones print here.',
				checkedAt: 'Last checked {time}',
				reconnecting: 'Can’t reach the server. Retrying…',
				signInRequired: 'This print station needs to sign in again.',
				signIn: 'Sign in',
				notPermitted:
					'This account can’t run the print station. Sign in with the shared check-in account.',
				recent: 'Printed recently',
				noneYet: 'Nothing printed yet.',
				keepOpen:
					'Keep this window open and visible. Volunteers can only send tags here while it is.',
				setupTitle: 'Printing without a dialog',
				setup:
					'Each tag prints without a dialog only when this browser was started for it. Quit the browser completely, then start it with:',
			},
			language: 'Language',
			household: 'Household of {count}',
			elapsedMinutes: '{minutes}m',
			elapsedJustNow: 'now',
			guestDetails: {
				title: 'Guest details',
				pronunciation: 'Pronunciation',
				pronunciationHelp: 'How to say their name, the way it sounds.',
				staffNotes: 'Staff notes',
				staffNotesHelp: 'Only staff see these. The guest never does.',
				save: 'Save details',
				saving: 'Saving…',
				saved: 'Guest details saved.',
				saveFailed: 'The guest details couldn’t be saved. Try again.',
			},
			history: {
				title: 'History',
				empty: 'No history recorded for this visit.',
				kinds: {
					registered: 'Registered',
					added: 'Added by hand',
					drawn: 'Drawn in the lottery',
					not_drawn: 'Not drawn',
					called: 'Called',
					served: 'Served',
					no_show: 'Marked no-show',
					returned: 'Returned to queue',
					cancelled: 'Cancelled',
				},
				returnedToBack: 'to the back',
				returnedToFront: 'to the front',
				byWorker: 'By {name}',
				byUnnamedWorker: 'By a volunteer',
				byGuest: 'By the guest',
				byLottery: 'Lottery draw',
				bySessionEnding: 'Session ended',
				bySystem: 'Automatically',
			},
		},
		kioskUnlock: {
			open: 'Unlock a room display',
			title: 'Unlock a Room Display',
			goTo: 'On the display, go to',
			typeCode: 'Then type this code',
			instructions: 'It works on any number of displays until {time}.',
			expired: 'This code has expired.',
			newCode: 'Get a new code',
			done: 'Done',
			failed: 'Couldn’t get a code for the room display. Try again.',
			display: {
				locked: 'This display is locked. A staff member needs to unlock it.',
				codeLabel: 'Unlock code',
				unlock: 'Unlock',
				wrongCode: 'That code didn’t work. Get a new one from the queue screen.',
				unlockFailed: 'Can’t reach the server. Try again.',
			},
		},
		printStationCard: {
			title: 'Start the Printing Station',
			online: 'Online',
			offline: 'Offline',
			account:
				'Sign in with the shared check-in account, here and at the queue desk. Chrome usually remembers it; if it asks, a team leader has the sign-in. Don’t write the password down or save it anywhere else.',
			steps: [
				{
					id: 'printing-power',
					title: 'Turn on the iMac and the label printer',
					detail: 'Check the printer has labels in it.',
				},
				{
					id: 'printing-quit-chrome',
					title: 'Quit Chrome completely',
					detail: 'Click any Chrome window and press Command-Q. Closing its windows isn’t enough.',
				},
				{
					id: 'printing-start',
					title: 'Start the printing station',
					detail:
						'Use the iMac’s automation. A Chrome window opens on the printing station; sign in if it asks. If it doesn’t start, see Start Printing by Hand below.',
				},
				{
					id: 'printing-wait-online',
					title: 'Wait for Online',
					detail: 'Leave that window open for the whole market.',
				},
			],
			commandLabel: 'Market-Day Command',
			runCommandTitle: 'How to Run It in Terminal',
			runCommandSteps: [
				'Press Command-Space, type Terminal, and press Return.',
				'Click inside the Terminal window, paste with Command-V, and press Return.',
				'Close Terminal once Chrome opens.',
			],
			copy: 'Copy',
			copied: 'Copied',
			copyFailed: 'Couldn’t copy the command. Select it and copy it instead.',
			openInstead:
				'Can’t run the command? Open the station from here, on the iMac only. Every tag then asks before it prints.',
			open: 'Open Printing Station',
			troubleshooting: [
				{
					problem: 'The printing station says Offline',
					fix: 'Its window was closed, or the iMac went to sleep. Wake the iMac; if the window is gone, start the printing station again.',
				},
				{
					problem: 'A print window pops up for every tag',
					fix: 'Chrome was opened the usual way instead of by the automation. Quit Chrome (Command-Q) and start the printing station again.',
				},
				{
					problem: 'It says Online, but nothing prints',
					fix: 'Check the printer is switched on, its USB cable is plugged in, and it has labels. Then print the tag again.',
				},
				{
					problem: 'Tags come out small, or with a white border',
					fix: 'Do One Test Print under First-Time Setup again, making sure Scale is 100% and the paper is 30857.',
				},
				{
					problem: 'It says this account can’t run the print station',
					fix: 'It’s signed in with an account that can’t print. Sign out and sign in with the shared check-in account.',
				},
				{
					id: 'certificate-warning',
					problem: 'Chrome says “Your connection is not private”',
					fix: 'The room display’s Mac mini is too old for updates, so its Chrome no longer recognizes the app’s security certificate. Go past the warning only on that Mac mini, and only when the address bar shows {host}: click Advanced, then “Proceed to {host} (unsafe)”. If there’s no Proceed link, click on the warning page and type thisisunsafe; nothing shows as you type, and the page loads. On any other computer or phone, don’t go past this warning: tell a team leader.',
				},
				{
					problem: 'The room display asks for a code',
					fix: 'Get an unlock code from the Room Display steps above, or ask a team leader for one.',
				},
			],
			setupTitle: 'Check-In iMac',
			setupGroups: [
				{
					title: 'Printer',
					steps: [
						'Download Dymo’s software for the LabelWriter 450 from Dymo’s website and install it. Then plug the printer into the iMac with its USB cable.',
						'Load Dymo 30857 name badge labels.',
						'Make the LabelWriter the default printer: in System Settings, choose Printers & Scanners and pick it next to “Default printer”.',
					],
				},
				{
					title: 'Keep It Awake',
					steps: [
						'In System Settings, choose Lock Screen and set the screen saver and “Turn display off” options to Never.',
					],
				},
				{
					title: 'One Test Print',
					steps: [
						'Quit Chrome (Command-Q). Run the first-time command below in Terminal and sign in with the shared check-in account.',
						'On your phone, open the queue desk, pick any guest, and tap Print name tag.',
						'A print window appears on the iMac. Choose the LabelWriter, 30857 as the paper size, Margins: None, and Scale: 100%. Click Print; Chrome remembers these choices.',
						'Quit Chrome. From now on, the market-day steps are all you need.',
					],
				},
			],
			setupCommandLabel: 'First-Time Command',
			guide: 'Full setup guide',
		},
		checklist: {
			title: 'Checklist',
			intro: 'Set up both stations before doors open. Tick each step off as you go.',
			progress: '{done} of {total} done',
			complete: 'All done',
			doneWhen: 'Done when',
			showSteps: 'Show steps',
			hideSteps: 'Hide steps',
			automatic: 'Ticked by the app',
			ticksNeedSession: 'Steps can be ticked off once a session is scheduled.',
			floorPlan: {
				title: 'Where Things Go',
				alt: 'Floor plan of the lobby and the back of the auditorium. The auditorium’s seats are in five sections facing the stage, with a sound booth at the back of the middle one. The waiting area is the back half of the two sections on the far left. 1, the room display, stands against the auditorium’s back wall behind the stairway to the lower level, just left of two large pillars by the center exit, facing the waiting area. 2, the check-in desk, stands at the left edge of the lobby by the restrooms, below a wall outlet.',
				zoomIn: 'Zoom In',
				zoomOut: 'Zoom Out',
				reset: 'Reset',
			},
			roomDisplay: {
				title: 'Room Display',
				place: 'Auditorium, back wall',
				closeUpAlt:
					'Close-up of 1 on the floor plan: the room display against the auditorium’s back wall, just left of the pillar, with the waiting area to its upper left and its outlet behind it.',
				steps: [
					{
						id: 'room-place',
						title: 'Roll the TV stand to 1',
						detail:
							'Against the back wall, just left of the pillar. Angle the screen toward the waiting area.',
					},
					{
						id: 'room-power',
						title: 'Plug in and turn everything on',
						detail:
							'Plug the stand into the outlet on the wall behind it. Turn on the TV, then the Mac mini if it hasn’t started by itself, then the keyboard.',
					},
					{
						id: 'room-open',
						title: 'Open the line board in Chrome',
						detail:
							'If Chrome didn’t open it by itself, click Chrome in the Dock, type this address into the bar at the top, and press Enter.',
					},
					{
						id: 'room-full-screen',
						title: 'Fill the screen',
						detail:
							'With the keyboard’s touchpad, click the full-screen button in the bottom-right corner of the line board. It disappears once the board fills the TV.',
					},
				],
				hardware: {
					alt: 'The TV on its rolling stand between two upright posts, with the Mac mini wedged on top of the bracket behind it, sticking up above the TV. Its power button is on its back, at the corner beside the power cord. Below, the wireless keyboard with its on/off switch on the right of its top edge.',
					macMini:
						'Mac mini: the round button on its back, at the corner beside where the power cord goes in. Reach over the top of the TV to press it.',
					keyboard:
						'Keyboard: slide the switch on the right of its top edge to On. Its touchpad moves the pointer.',
				},
				addressLabel: 'Address',
				unlockHint: 'If it asks for an unlock code, it then stays unlocked for about six months.',
				getCode: 'Get an Unlock Code',
				askForCode: 'If it asks for an unlock code, ask a team leader to get one for you.',
				certificateHelp: 'Chrome says “Your connection is not private”?',
				fullScreenButtonAlt: 'The full-screen button: four corners pointing outward.',
				doneWhen: 'the line board fills the TV and faces the waiting area.',
			},
			checkIn: {
				title: 'Check-In',
				place: 'Lobby, by the restrooms',
				closeUpAlt:
					'Close-up of 2 on the floor plan: the check-in cabinet at the left edge of the lobby by the restrooms, below its wall outlet.',
				placeTitle: 'Place the Cabinet',
				placeSteps: [
					{
						id: 'check-in-place',
						title: 'Roll the cabinet to 2',
						detail:
							'Where the coffee usually is. Turn the iMac so guests in the lobby can’t see its screen; the volunteer stands on the cabinet’s left.',
					},
					{
						id: 'check-in-power',
						title: 'Plug in at the outlet above it',
						detail: 'The label printer sits on the cabinet beside the iMac.',
					},
				],
				queueDeskTitle: 'Open the Queue Desk',
				queueDeskWait:
					'Wait until the printing station says Online: starting it quits Chrome, which would close a queue desk opened sooner.',
				queueDeskSteps: [
					{
						id: 'queue-open-chrome',
						title: 'Open Chrome again from the Dock',
						detail: 'Leave the printing station’s window open behind it.',
					},
					{
						id: 'queue-sign-in',
						title: 'Go to the queue desk and sign in',
						detail: 'Use the shared check-in account, the same one as the printing station.',
					},
				],
				queueDeskAddressLabel: 'Address',
				openQueueDesk: 'Open Queue Desk',
				doneWhen: 'the printing station says Online and the queue desk is open beside it.',
			},
			session: {
				scheduledTitle: 'Session Scheduled',
				scheduled: 'Registration opens {opens}, for {capacity} guests.',
				underway: 'Today’s session is underway.',
				missingTitle: 'No Session Scheduled',
				missing:
					'One is usually added on its own when the last one ends. If not, add it from the schedule, or ask a team leader to.',
				openSchedule: 'Open Schedule',
			},
			reference: {
				title: 'When You Need It',
				troubleshootingTitle: 'If Something Goes Wrong',
				byHandTitle: 'Start Printing by Hand',
				byHandIntro:
					'Only if the iMac’s automation doesn’t start the printing station. Quit Chrome first (Command-Q).',
				setupTitle: 'First-Time Setup',
				setupIntro: 'Once per computer. Skip this on a normal market day.',
				macMiniTitle: 'Room Display Mac Mini',
				macMiniIntro:
					'So that plugging in the stand is all it takes to bring the line board back. Names are as in System Preferences on older macOS; System Settings on newer Macs has the same options.',
				macMiniSteps: [
					'Start up when the stand is plugged in: in Energy Saver, turn on “Start up automatically after a power failure”. Then nobody needs to reach its power button.',
					'Log in by itself: in Users & Groups, click the lock, then Login Options, and set “Automatic login” to the display’s account. If that is greyed out, FileVault is on; turn it off under Security & Privacy first.',
					'Open Chrome at login: right-click Chrome in the Dock and choose Options, then Open at Login. In Chrome’s settings, under On Startup, choose “Continue where you left off”, so it comes back to the line board.',
					'Stop it from sleeping: in Energy Saver, set “Turn display off after” to Never and turn on “Prevent computer from sleeping automatically when the display is off”. In Desktop & Screen Saver, set the screen saver to start Never.',
				],
			},
		},
	},
} satisfies Record<'en', AdminTranslation>;
