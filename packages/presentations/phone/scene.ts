/**
 * What a guide's beat script asks the guest phone to show at one moment: the phone's clock and
 * language, what the guest has done on it, what the market's server would answer, and what the
 * narration points at. The phone (`phone/main.tsx`) turns a scene into the app's own stores and
 * screens. Types only, so a page's script can import it and keep nothing at runtime.
 */
import type { GuestFormState } from '../../../src/components/types.ts';
import type { Locale } from '../../../src/locales.ts';
import type { VisitStatus } from '../../../src/services/visitStateMachine.ts';
import type { FrameHandle } from '../stage/frame.ts';

export interface PhoneIdentity {
	firstName: string;
	lastName: string;
	phone: string;
}

/** The market as `/api/market` describes it; `inactive` has no session. */
export type PhoneMarket =
	| { status: 'inactive' }
	| {
			status: 'registration_open' | 'registration_closed' | 'lottery_pending' | 'service_started';
			/** When registration closes, in epoch milliseconds on the phone's clock. */
			registrationClosesAt: number;
	  };

/** The guest's visit as `/api/visit` describes it. */
export interface PhoneVisit {
	status: VisitStatus;
	/** Their number in line once drawn. */
	queuePosition: number | null;
	aheadOfYou: number | null;
	/** When the desk called them, in epoch milliseconds on the phone's clock. */
	calledAt: number | null;
	nowCalling: number | null;
	/** Numbers called before, still on the room display. */
	called: number[];
}

/** Text updates: whether the guest has agreed, and how far through the sign-up sheet they are. */
export interface PhoneTexts {
	consented: boolean;
	/** The sign-up sheet: shut, open, or open with its consent box ticked. */
	sheet: 'closed' | 'open' | 'checked';
}

export interface PhoneScene {
	/** The phone's clock, in epoch milliseconds. Whole seconds, so screens re-render once a second. */
	now: number;
	locale: Locale;
	route: 'home' | 'help';
	/** Whether the guest has chosen a language yet, which retires the introduction. */
	returning: boolean;
	/** Who this phone remembers; `null` for a guest who has not registered on it. */
	identity: PhoneIdentity | null;
	/** What the guest has filled in on the registration form so far. */
	form: Omit<GuestFormState, 'pronunciation'>;
	/** The registration form has been sent and is waiting for its answer. */
	submitting: boolean;
	market: PhoneMarket;
	visit: PhoneVisit | null;
	texts: PhoneTexts;
	/** What the narration points at, by mark name (see `phone/marks.ts`). */
	focus: string | null;
	/** What a finger is on, by mark name. */
	tap: string | null;
	/** The mark the screen scrolls to keep in view, or `null` for the top. */
	scrollTo: string | null;
}

/**
 * The phone a page's script drives, as the phone's frame exposes it to the page. A change of
 * language starts the phone over, as a seek does.
 */
export type PhoneHandle = FrameHandle<PhoneScene>;

declare global {
	interface Window {
		phone?: PhoneHandle;
	}
}
