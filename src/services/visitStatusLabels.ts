import { type AdminLocale, adminTranslations } from '../adminLocales';
import { translations, type Locale } from '../locales';
import type { VisitStatus } from './visitStateMachine';

/**
 * The localized name for each visit status.
 *
 * Guests and workers read different words for the same status — a guest is told "You're in line",
 * a worker sees "Waiting" — so the two audiences get their own map, drawn from their own
 * dictionary. Keeping both here means a new `VisitStatus` fails to compile until somebody has
 * decided what each audience should be shown, instead of silently rendering a blank label.
 */

/** How the guest-facing screens name a visit status. */
export function guestVisitStatusLabel(locale: Locale, status: VisitStatus): string {
	const t = translations[locale];

	return {
		registered: t.statusRegistered,
		waiting: t.statusWaiting,
		called: t.statusCalled,
		served: t.statusServed,
		not_placed: t.statusNotPlaced,
		no_show: t.statusNoShow,
		cancelled: t.statusCancelled,
	}[status];
}

/** How the admin screens name every visit status. */
export function adminVisitStatusLabels(locale: AdminLocale): Record<VisitStatus, string> {
	const t = adminTranslations[locale];
	const base = translations[locale];

	return {
		waiting: t.waiting,
		called: base.statusCalled,
		served: t.served,
		registered: t.registered,
		not_placed: t.notPlaced,
		no_show: t.noShow,
		cancelled: t.cancelled,
	};
}
