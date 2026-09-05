import { useEffect, useState } from 'react';

/**
 * Milliseconds left until `endTimeMs`, recomputed once a second. Negative once the deadline has
 * passed — callers decide what that means, since "overdue" reads differently for a registration
 * window than for a refresh that is already in flight.
 *
 * The deadline is a number rather than a `Date` on purpose: it keys the interval effect, and a
 * `Date` rebuilt by a MobX computed on every read would tear the timer down and recreate it on
 * every render.
 */
export function useCountdownTimer(endTimeMs: number): number {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 1_000);

		return () => clearInterval(timer);
	}, [endTimeMs]);

	return endTimeMs - now;
}
