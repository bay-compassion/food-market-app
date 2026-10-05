import { useEffect, useState } from 'react';

import type { LanguageRotation, RotationTurn } from '../../models/language-rotation';

/** Browsers fire a timeout beyond 2³¹−1 ms at once, which a fixed language's endless slot would
 *  turn into a busy loop. Waking hourly to find nothing changed costs nothing. */
const longestWaitMs = 60 * 60 * 1_000;

/**
 * The rotation's turn as of the last change, re-rendering exactly when the next one starts — one
 * timeout to the boundary rather than a ticking interval. Anything that moves within a turn, like
 * the indicator's countdown, animates in CSS from the turn's `elapsedMs` instead of re-rendering.
 */
export function useRotationTurn<Locale extends string>(
	rotation: LanguageRotation<Locale>,
): RotationTurn<Locale> {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const timer = setTimeout(
			() => setNow(Date.now()),
			Math.min(rotation.turnAt(Date.now()).remainingMs, longestWaitMs),
		);

		return () => clearTimeout(timer);
	}, [now, rotation]);

	return rotation.turnAt(now);
}
