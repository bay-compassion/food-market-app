import type { AgeRange } from '../../../services/ageRanges';
import { useTranslation } from '../../../stores/react/use-translation';

/** Each age range as the guest's language words it. */
export function useAgeRangeLabels(): Record<AgeRange, string> {
	const t = useTranslation();

	return {
		'0-17': t.ageRange0to17,
		'18-29': t.ageRange18to29,
		'30-44': t.ageRange30to44,
		'45-59': t.ageRange45to59,
		'60-74': t.ageRange60to74,
		'75+': t.ageRange75plus,
	};
}
