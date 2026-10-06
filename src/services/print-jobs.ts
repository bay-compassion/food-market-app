import type { Locale } from '../locales.ts';

/**
 * A name tag waiting at the print station, as `GET /api/admin/print-jobs` returns it. Only what the
 * label shows travels: the first name, the last name's initial, the place in line, and the language.
 */
export type NameTagPrintJob = {
	/** Sorts in the order the tags were sent. */
	id: string;
	visitId: string;
	firstName: string;
	lastInitial: string;
	queuePosition: number | null;
	locale: Locale;
	/** ISO timestamp. */
	requestedAt: string;
};

/** What `POST /api/admin/print-jobs` answers: sent to the station, or no station to send it to. */
export type PrintJobSubmission = { queued: true } | { queued: false; reason: 'station_offline' };
