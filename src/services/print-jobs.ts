import type { Locale } from '../locales.ts';

/**
 * A name tag waiting at the print station, as `GET /api/admin/print-jobs` returns it. Only what the
 * label shows travels: the first name, the last name's initial, how to say the name, the queue
 * number, and the language.
 */
export type NameTagPrintJob = {
	/** Sorts in the order the tags were sent. */
	id: string;
	visitId: string;
	firstName: string;
	lastInitial: string;
	pronunciation: string | null;
	queuePosition: number | null;
	priorityNumber: number | null;
	locale: Locale;
	/** ISO timestamp. */
	requestedAt: string;
};

/** What `POST /api/admin/print-jobs` answers: sent to the station, or no station to send it to. */
export type PrintJobSubmission = { queued: true } | { queued: false; reason: 'station_offline' };
