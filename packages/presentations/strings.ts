/**
 * The app's own copy, cut down to what the stage shows: the guest phones and room display in every
 * language (`guestStrings`), and the queue desk in English (`deskStrings`). The build inlines both,
 * so a copy change in `src/locales.ts` or `src/adminLocales.ts` reaches the videos on the next build.
 */
import type { AdminTranslation } from '../../src/adminLocales.ts';
import type { Locale, Translation } from '../../src/locales.ts';
import { NextRegistration } from '../../src/models/next-registration.ts';

/**
 * `copy` with every sentence about the next registration filled in undated — "next Saturday at
 * 10:30" — as the guide's phone shows it: the guide is watched on any day, so it never names one.
 */
function undated<T>(
	copy: T,
	phrases: Translation['guestView']['nextRegistration'],
	locale: Locale,
): T {
	if (typeof copy === 'string') {
		return (
			copy.includes('{when}') ? NextRegistration.next.fill(copy, phrases, locale, new Date()) : copy
		) as T;
	}

	if (Array.isArray(copy)) {
		return copy.map((item: unknown) => undated(item, phrases, locale)) as T;
	}

	if (copy && typeof copy === 'object') {
		return Object.fromEntries(
			Object.entries(copy).map(([key, value]) => [key, undated(value, phrases, locale)]),
		) as T;
	}

	return copy;
}

/** Only the copy the guest phones and the room display show, for one language. */
export function guestStrings(t: Translation, locale: Locale) {
	const guestView = undated(t.guestView, t.guestView.nextRegistration, locale);
	const visit = guestView.visitStatus;

	return {
		guide: {
			...guestView,
			help: t.help,
			language: t.language,
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
