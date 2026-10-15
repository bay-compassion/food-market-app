import type { GuestFormCopy } from '../../../locales';
import { useTranslation } from '../../../stores/react/use-translation';

/**
 * The guest-voiced registration copy in the guest's language, with any of it replaced by
 * `override`. Guests pass nothing; the admin dialog passes its staff wording.
 */
export function useGuestFormCopy(override?: Partial<GuestFormCopy>): GuestFormCopy {
	const t = useTranslation();

	return {
		informationLegend: t.guestView.forms.informationLegend,
		pronunciationOffer: t.guestView.forms.pronunciationOffer,
		pronunciationHelp: t.guestView.forms.pronunciationHelp,
		pronunciationCollapse: t.guestView.forms.pronunciationCollapse,
		lotteryLegend: t.guestView.forms.lotteryLegend,
		agePlaceholder: t.agePlaceholder,
		household: t.household,
		householdHint: t.householdHint,
		childrenCount: t.childrenCount,
		seniorsCount: t.seniorsCount,
		...override,
	};
}
