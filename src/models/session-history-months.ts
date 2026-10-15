import type { HistoricalEvent } from '../services/admin-api.ts';

/** One calendar month of past sessions, in the order the history lists them. */
export type SessionHistoryMonth = {
	/** `YYYY-MM` in the viewer's time zone, the month the session's registration opened in. */
	key: string;
	/** The first day of that month, for formatting its heading. */
	start: Date;
	sessions: HistoricalEvent[];
};

/**
 * Past sessions grouped by the month they ran in, so a long history reads as months rather than
 * one undivided list. Sessions keep the order they arrive in (newest first, as the server sends
 * them); a month starts wherever its first session falls.
 */
export class SessionHistoryMonths {
	constructor(private readonly history: readonly HistoricalEvent[]) {}

	get months(): SessionHistoryMonth[] {
		const months: SessionHistoryMonth[] = [];

		for (const session of this.history) {
			const opened = new Date(session.registrationOpensAt);
			const key = `${opened.getFullYear()}-${String(opened.getMonth() + 1).padStart(2, '0')}`;
			const last = months.at(-1);

			if (last?.key === key) {
				last.sessions.push(session);
			} else {
				months.push({
					key,
					start: new Date(opened.getFullYear(), opened.getMonth(), 1),
					sessions: [session],
				});
			}
		}

		return months;
	}
}
