export type CalendarInviteDetails = {
	startsAt: Date;
	endsAt: Date;
	title: string;
	/** Where the event links back to: the guest app. */
	url: string;
};

/** Minutes before the start that the guest's calendar reminds them. */
const reminderMinutes = 10;

/**
 * One event as an iCalendar (RFC 5545) file, which every phone's calendar opens: what an "Add to
 * Calendar" link downloads. Times are written in UTC, so the file needs no time zone of its own.
 */
export class CalendarInvite {
	private readonly details: CalendarInviteDetails;
	private readonly stampedAt: Date;

	constructor(details: CalendarInviteDetails, stampedAt: Date = new Date()) {
		this.details = details;
		this.stampedAt = stampedAt;
	}

	get fileName(): string {
		return 'bay-compassion-registration.ics';
	}

	/** The file as a link target, so the link itself is the download. */
	get dataUri(): string {
		return `data:text/calendar;charset=utf-8,${encodeURIComponent(this.ics)}`;
	}

	get ics(): string {
		const { startsAt, endsAt, title, url } = this.details;

		return [
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//The Bay Compassion//Food Market//EN',
			'BEGIN:VEVENT',
			`UID:registration-${utcStamp(startsAt)}@bay-compassion`,
			`DTSTAMP:${utcStamp(this.stampedAt)}`,
			`DTSTART:${utcStamp(startsAt)}`,
			`DTEND:${utcStamp(endsAt)}`,
			`SUMMARY:${escapeText(title)}`,
			`URL:${url}`,
			`DESCRIPTION:${escapeText(url)}`,
			'BEGIN:VALARM',
			'ACTION:DISPLAY',
			`TRIGGER:-PT${reminderMinutes}M`,
			`DESCRIPTION:${escapeText(title)}`,
			'END:VALARM',
			'END:VEVENT',
			'END:VCALENDAR',
		]
			.map(fold)
			.join('\r\n')
			.concat('\r\n');
	}
}

/** `20261031T173000Z`: the UTC form iCalendar's date-times take. */
function utcStamp(at: Date): string {
	return at
		.toISOString()
		.replace(/[-:]/g, '')
		.replace(/\.\d{3}/, '');
}

/** A TEXT value, with the characters iCalendar reserves escaped. */
function escapeText(text: string): string {
	return text.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
}

/** Lines longer than 75 octets continue on the next, indented by a space, never mid-character. */
function fold(line: string): string {
	const encoder = new TextEncoder();
	const parts: string[] = [];
	let current = '';
	let octets = 0;

	for (const char of line) {
		const size = encoder.encode(char).length;
		const limit = parts.length === 0 ? 75 : 74;

		if (octets + size > limit) {
			parts.push(current);
			current = '';
			octets = 0;
		}

		current += char;
		octets += size;
	}

	parts.push(current);

	return parts.join('\r\n ');
}
