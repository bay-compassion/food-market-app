import { type Locale, translations } from '../../locales';
import { NextRegistration } from '../../models/next-registration';

/**
 * A sentence about the next registration as the app tells it when the server has no schedule to
 * date it — "every Saturday" — which is what a story or test sees, since none of them seeds one.
 */
export function unscheduled(template: string, locale: Locale = 'en'): string {
	return NextRegistration.every.fill(
		template,
		translations[locale].guestView.nextRegistration,
		locale,
		new Date(),
	);
}
