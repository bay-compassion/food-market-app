/** A time of day, as the Today screen writes it. */
export function formatClockTime(time: Date, locale: string): string {
	return new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(time);
}

/** Time left in minutes and seconds, never below zero. */
export function formatCountdown(remainingMs: number): string {
	const seconds = Math.max(0, Math.ceil(remainingMs / 1000));

	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
