import { useRootStore } from '../../stores/react/store-context';
import { useToday } from './use-today';

/**
 * Fills a sentence's `{when}`, `{minutes}` and `{closeTime}` with when registration next opens, in
 * the guest's language. Re-reads the day at midnight, so "tomorrow" becomes "today" on a screen
 * left open overnight. The calling component must be an `observer()`.
 */
export function useNextRegistrationText(): (template: string) => string {
	const { session, translations } = useRootStore();
	const today = useToday();
	const next = session.nextRegistration;
	const phrases = translations.translation.guestView.nextRegistration;
	const locale = translations.locale;

	return (template) => next.fill(template, phrases, locale, today);
}
