import { useEffect, useState } from 'react';

/**
 * The current time in milliseconds, refreshed every `intervalMs` — or not at all with `null`, for
 * a component that only needs the clock some of the time and should not re-render on it otherwise.
 */
export function useNow(intervalMs: number | null): number {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		if (intervalMs === null) {
			return;
		}

		setNow(Date.now());
		const timer = setInterval(() => setNow(Date.now()), intervalMs);

		return () => clearInterval(timer);
	}, [intervalMs]);

	return now;
}
