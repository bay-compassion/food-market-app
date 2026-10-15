/**
 * What a guide's beat script asks the admin dashboard to show at one moment: the frame's clock,
 * the screen the worker is on, the market and its guests as the server would report them, what is
 * open or typed on screen, and what the narration points at. The frame (`admin/device.tsx`) turns
 * a scene into the app's own stores and screens. Types only, so a page's script can import it and
 * keep nothing at runtime.
 */
import type { AdminTranslation } from '../../../src/adminLocales.ts';
import type { GuestFormState } from '../../../src/components/types.ts';
import type { Locale } from '../../../src/locales.ts';
import type { AdminView } from '../../../src/services/admin-views.ts';
import type { SessionStatus } from '../../../src/services/sessionStateMachine.ts';
import type { VisitStatus } from '../../../src/services/visitStateMachine.ts';
import type { FrameHandle } from '../stage/frame.ts';

/** One guest who joined today's session, as the guide follows them. */
export interface AdminSceneGuest {
	/** Their place in the order they registered, which also names their records. */
	n: number;
	first: string;
	last: string;
	phone: string;
	locale: Locale;
	household: number;
	status: VisitStatus;
	/** Their number in line once drawn. */
	queuePosition: number | null;
	/** When the queue desk called them, in epoch milliseconds on the frame's clock. */
	calledAt: number | null;
}

/** Today's session, as the market's server holds it. */
export interface AdminSceneMarket {
	/** `ended` once it is closed; the schedule's next session is then the current one. */
	status: SessionStatus;
	/** When today's registration opens and closes (early, if closed early), in epoch milliseconds. */
	opensAt: number;
	closesAt: number;
	capacity: number;
	/** How long registration stays open each week, as the schedule's pattern sets it. */
	windowMinutes: number;
	/** Minutes after the grace period the lottery draws on its own; `null` draws by hand. */
	lotteryDelayMinutes: number | null;
}

/** What the worker has typed into the add-guest dialog: the guest's own registration fields. */
export type AdminSceneGuestForm = Omit<GuestFormState, 'pronunciation'>;

/**
 * Something the narration points at, by what it is rather than where it sits in the markup (see
 * `admin/marks.ts`). The keyed kinds name the app's own English copy, so a mark follows a relabelled
 * button and a key removed from `adminLocales.ts` fails the type check.
 */
export type AdminMark =
	| `tab:${AdminView}`
	| `button:${KeysOf<string>}`
	| `heading:${KeysOf<string>}`
	| `field:${KeysOf<string>}`
	| `labelled:${KeysOf<string>}`
	| `sheet:${KeysOf<string>}`
	| `row:${number}`
	| 'switcher'
	| 'navigation'
	| 'status'
	| 'step'
	| 'timer'
	| 'sheet'
	| 'dialog'
	| 'reset'
	| 'overview'
	| 'call-next'
	| 'feedback'
	| 'history'
	| 'search'
	| 'report';

type KeysOf<Value> = {
	[Key in keyof AdminTranslation]: AdminTranslation[Key] extends Value ? Key : never;
}[keyof AdminTranslation];

export interface AdminScene {
	/** The frame's clock, in epoch milliseconds. Whole seconds, so screens re-render once a second. */
	now: number;
	view: AdminView;
	market: AdminSceneMarket;
	guests: AdminSceneGuest[];
	/** Today's session has moved to Session history. */
	archived: boolean;
	/** Whether the view switcher's sheet of screens is open. */
	navigating: boolean;
	/** The button whose confirmation sheet is open, or `null` for none. */
	confirm: AdminMark | null;
	/** The add-guest dialog and what is typed into it, or `null` while it is shut. */
	addGuest: AdminSceneGuestForm | null;
	/** What is typed into the broadcast form. */
	broadcast: { title: string; body: string };
	/** What the narration points at. */
	focus: AdminMark | null;
	/** What a finger is on. */
	tap: AdminMark | null;
	/** The mark the screen scrolls to keep in view, or `null` for the top. */
	scrollTo: AdminMark | null;
}

/** The dashboard a page's script drives, as the frame exposes it to the page. */
export type AdminHandle = FrameHandle<AdminScene>;

declare global {
	interface Window {
		admin?: AdminHandle;
	}
}
