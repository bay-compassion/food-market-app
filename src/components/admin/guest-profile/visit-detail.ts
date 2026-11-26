import { adminTranslations } from '../../../adminLocales';
import type { GuestProfileVisit } from '../../../models/guest-profile';
import { QueueNumber } from '../../../models/queue-number';

/** What one visit was, in a line: its number or track, who made it, and the household it recorded. */
export function visitDetail(visit: GuestProfileVisit): string {
	const t = adminTranslations.en.guestProfile;
	const number = QueueNumber.of(visit);

	return [
		visit.track === 'premarket'
			? t.premarket
			: number
				? t.visitNumber.replace('{number}', number.label)
				: null,
		visit.source === 'admin' ? t.addedByStaff : null,
		`${t.household} ${visit.householdSize}`,
	]
		.filter(Boolean)
		.join(' · ');
}
