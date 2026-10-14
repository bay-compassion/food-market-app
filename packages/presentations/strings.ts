/**
 * The app's own copy, cut down to what the stage shows: the guest phones and room display in every
 * language (`guestStrings`), and the queue desk in English (`deskStrings`). The build inlines both,
 * so a copy change in `src/locales.ts` or `src/adminLocales.ts` reaches the videos on the next build.
 */
import type { AdminTranslation } from '../../src/adminLocales.ts';
import type { Locale, Translation } from '../../src/locales.ts';

/** Only the copy the guest phones and the room display show, for one language. */
export function guestStrings(t: Translation) {
	const visit = t.guestView.visitStatus;

	return {
		guide: {
			...t.guestView,
			help: t.help,
			language: t.language,
			formTitle: t.formTitle,
			formDescription: t.formDescription,
			age: t.age,
			agePlaceholder: t.agePlaceholder,
			ageRange: t.ageRange30to44,
			household: t.household,
			householdHint: t.householdHint,
			children: t.childrenCount,
			seniors: t.seniorsCount,
			privacy: t.privacy,
			submitting: t.submitting,
		},
		welcome: t.welcome,
		languagePrompt: t.languagePrompt,
		info: t.guestView.forms.informationLegend,
		firstName: t.firstName,
		lastName: t.lastName,
		phone: t.phone,
		submit: t.signupView.submit,
		yourNumber: visit.yourNumberLabel,
		joinLottery: t.submit,
		closesIn: t.registrationClosesIn,
		registered: visit.registered.header,
		registeredDetails: visit.registered.details,
		notPlaced: visit.not_placed.header,
		notPlacedDetails: visit.not_placed.details,
		noShow: visit.no_show.header,
		noShowDetails: visit.no_show.details,
		waiting: visit.waiting.header,
		waitingDetails: visit.waiting.details,
		nowCallingLabel: visit.waiting.nowCallingLabel,
		none: visit.waiting.nowCallingNone,
		called: visit.called.header,
		calledDetails: visit.called.details,
		late: visit.called.detailsLate,
		served: visit.served.header,
		servedDetails: visit.served.details,
		marketName: t.marketName,
		kiosk: {
			none: t.kiosk.nowCallingNone,
			nowCalling: t.kiosk.nowCalling,
			still: t.kiosk.stillWaitingFor,
			waitingCount: t.kiosk.waitingCount,
		},
	};
}

export type GuestStrings = ReturnType<typeof guestStrings>;

/** Every language's guest copy, by locale. */
export type StageStrings = Record<Locale, GuestStrings>;

/** The queue desk's copy. Staff screens are English only. */
export function deskStrings(t: AdminTranslation, guest: Translation) {
	const { history, printStation: _printStation, ...queueDesk } = t.queueDesk;

	return {
		...queueDesk,
		historyTitle: history.title,
		historyKinds: history.kinds,
		closeSession: t.closeSession,
		confirmCloseSession: t.confirmCloseSession,
		confirmCloseSessionOutstanding: t.confirmCloseSessionOutstanding,
		confirmContinue: t.confirmContinue,
		cancel: t.cancel,
		phoneGuest: t.phoneGuest,
		markServed: t.markServed,
		markNoShow: t.markNoShow,
		queueNotStarted: t.queueNotStarted,
		manualGuestTitle: t.manualGuestTitle,
		admissionLabel: t.admissionLabel,
		admitToQueue: t.admitToQueue,
		admitProfileOnly: t.admitProfileOnly,
		queuePlacement: t.queuePlacement,
		placeNext: t.placeNext,
		placeEnd: t.placeEnd,
		saveGuest: t.saveGuest,
		guestAdded: t.guestAdded,
		guestClaimShow: t.guestClaimShow,
		guestClaimTitle: t.guestClaimTitle,
		guestClaimInstructions: t.guestClaimInstructions,
		guestClaimDone: t.guestClaimDone,
		firstName: guest.firstName,
		lastName: guest.lastName,
		phone: guest.phone,
		statuses: {
			waiting: t.waiting,
			called: guest.guestView.visitStatus.labels.called,
			served: t.served,
			no_show: t.noShow,
			not_placed: t.notPlaced,
		},
	};
}

export type DeskStrings = ReturnType<typeof deskStrings>;
