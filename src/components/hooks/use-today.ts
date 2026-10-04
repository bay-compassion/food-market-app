import { useEffect, useState } from 'react';

/**
 * The current date, re-read when the calendar day turns over. A guest can leave the visit screen
 * open across midnight, and a date that stays on yesterday is exactly what a check-in worker is
 * looking for to turn a ticket away.
 */
export function useToday(): Date {
	const [today, setToday] = useState(() => new Date());

	useEffect(() => {
		const nextMidnight = new Date(today);

		nextMidnight.setHours(24, 0, 0, 0);

		const timer = setTimeout(() => setToday(new Date()), nextMidnight.getTime() - Date.now());

		return () => clearTimeout(timer);
	}, [today]);

	return today;
}
