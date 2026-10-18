import type { GuestReconciliation } from './guest-reconciliation.ts';

/** One served visit in the period, with what was true of the household at that visit. */
export type ServedVisit = {
	guestId: string;
	marketEventId: string;
	sessionOpensAt: Date;
	ageRange: string | null;
	householdSize: number;
	childrenCount: number;
	seniorsCount: number;
	locale: string;
};

export type CompositionRow = {
	category: 'age' | 'household' | 'language';
	value: string;
	people: number;
};

/**
 * How many people and households one period served, each counted once however often they came.
 *
 * Who is the same person comes from `GuestReconciliation`, not from guest ids, and what a person or
 * household looked like comes from their latest served visit in the period — household details are
 * recorded per visit, so the latest is what they last told us. A first-time person is one whose
 * first served visit ever, across every record reconciled to them, falls in the period; a visit's
 * own `is_first_visit` flag is set on every record a worker creates, so it overcounts.
 */
export class PeriodReach {
	private readonly latestByPerson: Map<string, ServedVisit>;
	private readonly latestByHousehold: Map<string, ServedVisit>;

	constructor(
		private readonly visits: readonly ServedVisit[],
		private readonly reconciliation: GuestReconciliation,
		/** The first session each guest record was ever served at. */
		private readonly firstServed: ReadonlyMap<string, Date>,
		private readonly period: { start: Date; end: Date },
	) {
		this.latestByPerson = PeriodReach.latestBy(visits, (id) => reconciliation.personOf(id));
		this.latestByHousehold = PeriodReach.latestBy(visits, (id) => reconciliation.householdOf(id));
	}

	static householdBand(size: number): string {
		if (size <= 1) {
			return '1';
		}

		if (size <= 3) {
			return '2-3';
		}

		if (size <= 5) {
			return '4-5';
		}

		return '6+';
	}

	get totals() {
		const households = [...this.latestByHousehold.values()];

		return {
			sessions: new Set(this.visits.map((visit) => visit.marketEventId)).size,
			visitsServed: this.visits.length,
			uniquePeople: this.latestByPerson.size,
			uniqueHouseholds: households.length,
			householdMembers: PeriodReach.sum(households, (visit) => visit.householdSize),
			children: PeriodReach.sum(households, (visit) => visit.childrenCount),
			seniors: PeriodReach.sum(households, (visit) => visit.seniorsCount),
			firstTimePeople: this.firstTimePeople,
		};
	}

	get composition(): CompositionRow[] {
		const counts = new Map<string, CompositionRow>();
		const count = (category: CompositionRow['category'], value: string) => {
			const key = `${category}\u0000${value}`;
			const row = counts.get(key) ?? { category, value, people: 0 };

			row.people += 1;
			counts.set(key, row);
		};

		for (const visit of this.latestByPerson.values()) {
			count('age', visit.ageRange ?? 'unknown');
			count('household', PeriodReach.householdBand(visit.householdSize));
			count('language', visit.locale);
		}

		return [...counts.values()].sort(
			(a, b) => a.category.localeCompare(b.category) || a.value.localeCompare(b.value),
		);
	}

	private get firstTimePeople(): number {
		const firstByPerson = new Map<string, number>();

		for (const [guestId, first] of this.firstServed) {
			const person = this.reconciliation.personOf(guestId);
			const earliest = firstByPerson.get(person);

			if (earliest === undefined || first.getTime() < earliest) {
				firstByPerson.set(person, first.getTime());
			}
		}

		const { start, end } = this.period;

		return [...this.latestByPerson.keys()].filter((person) => {
			const first = firstByPerson.get(person);

			return first !== undefined && first >= start.getTime() && first < end.getTime();
		}).length;
	}

	private static latestBy(
		visits: readonly ServedVisit[],
		keyOf: (guestId: string) => string,
	): Map<string, ServedVisit> {
		const latest = new Map<string, ServedVisit>();

		for (const visit of visits) {
			const key = keyOf(visit.guestId);
			const current = latest.get(key);

			if (!current || visit.sessionOpensAt > current.sessionOpensAt) {
				latest.set(key, visit);
			}
		}

		return latest;
	}

	private static sum(visits: readonly ServedVisit[], value: (visit: ServedVisit) => number) {
		return visits.reduce((total, visit) => total + value(visit), 0);
	}
}
