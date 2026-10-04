import { useEffect, useState } from 'react';

import type { LanguageRotation } from '../../models/language-rotation';

/** Browsers fire a timeout beyond 2³¹−1 ms at once, which a fixed language's endless slot would
 *  turn into a busy loop. Waking hourly to find nothing changed costs nothing. */
const longestWaitMs = 60 * 60 * 1_000;

/**
 * The language a rotation is showing now, re-rendering exactly when it changes — one timeout to
 * the next boundary rather than a ticking interval.
 */
export function useRotatingLocale<Locale extends string>(
	rotation: LanguageRotation<Locale>,
): Locale {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const timer = setTimeout(
			() => setNow(Date.now()),
			Math.min(rotation.msUntilNextChange(Date.now()), longestWaitMs),
		);

		return () => clearTimeout(timer);
	}, [now, rotation]);

	return rotation.localeAt(now);
}
