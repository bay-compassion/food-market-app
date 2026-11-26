/**
 * A visit's calendar date (`YYYY-MM-DD`) as the admin screens write it: "Nov 19", with the year only
 * when it is not this one. Visit dates are calendar dates, so they are read and written in UTC to
 * keep a date from shifting by a day across time zones.
 */
export function formatVisitDate(date: string, today: Date = new Date()): string {
	const day = new Date(`${date}T00:00:00Z`);

	return day.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: day.getUTCFullYear() === today.getFullYear() ? undefined : 'numeric',
		timeZone: 'UTC',
	});
}
