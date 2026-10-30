import type { SessionTiming } from './session-timeline.ts';

export type SaturdayClockPosition = {
	fromStep: 0 | 1;
	toStep: 1 | 3;
	fraction: number;
};

/**
 * Wall-clock position on the published Saturday timetable, independent of the lottery result.
 * These times match the timetable in locales.ts; shopping has no configurable start time yet.
 * The session supplies the market date, not a promise that the draw has happened on time.
 */
export class SaturdayClock {
	static readonly timeZone = 'America/Los_Angeles';
	private static readonly parts = new Intl.DateTimeFormat('en-US', {
		timeZone: SaturdayClock.timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23',
	});

	constructor(private readonly session: Pick<SessionTiming, 'status' | 'registrationOpensAt'>) {}

	positionAt(now: number): SaturdayClockPosition | null {
		if (
			this.session.status === 'scheduled' ||
			this.session.status === 'ended' ||
			!Number.isFinite(now) ||
			!Number.isFinite(this.session.registrationOpensAt.valueOf())
		) {
			return null;
		}

		const current = this.localTime(new Date(now));
		const marketDay = this.localTime(this.session.registrationOpensAt).day;

		if (current.day !== marketDay || current.minute < 630) {
			return null;
		}

		return current.minute < 645
			? { fromStep: 0, toStep: 1, fraction: (current.minute - 630) / 15 }
			: { fromStep: 1, toStep: 3, fraction: Math.min(1, (current.minute - 645) / 45) };
	}

	labelAt(now: number, locale: string): string {
		return new Intl.DateTimeFormat(locale, {
			timeZone: SaturdayClock.timeZone,
			hour: 'numeric',
			minute: '2-digit',
		}).format(now);
	}

	private localTime(date: Date): { day: string; minute: number } {
		const parts = SaturdayClock.parts.formatToParts(date);
		const value = (type: Intl.DateTimeFormatPartTypes) =>
			parts.find((part) => part.type === type)?.value ?? '';

		return {
			day: `${value('year')}-${value('month')}-${value('day')}`,
			minute: Number(value('hour')) * 60 + Number(value('minute')) + Number(value('second')) / 60,
		};
	}
}
