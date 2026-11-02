const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

/** "Oct 31", the way every steward screen names a Saturday. */
export function shortDate(iso: string): string {
	return dateFormat.format(new Date(iso));
}

export function percent(share: number): string {
	return `${Math.round(share * 100)}%`;
}
