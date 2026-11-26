const timeFormat = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
const dateTimeFormat = new Intl.DateTimeFormat('en-US', {
	month: 'short',
	day: 'numeric',
	hour: 'numeric',
	minute: '2-digit',
});

/**
 * When something on a ticket happened: the time alone for today, as the queue's always are; the
 * date too for any other day — an ended session's ticket, a correction made days after it, or a
 * note from an earlier visit.
 */
export function formatTicketTime(at: Date, today: Date): string {
	return at.toDateString() === today.toDateString()
		? timeFormat.format(at)
		: dateTimeFormat.format(at);
}
