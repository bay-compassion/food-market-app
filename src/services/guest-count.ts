import { adminTranslations } from '../adminLocales.ts';

const plurals = new Intl.PluralRules('en');

/** "1 guest" or "4 guests", as the dashboard counts the guests an action covers. */
export function formatGuestCount(count: number): string {
	const forms = adminTranslations.en.participants.guestCount;

	return (plurals.select(count) === 'one' ? forms.one : forms.other).replace(
		'{count}',
		String(count),
	);
}
