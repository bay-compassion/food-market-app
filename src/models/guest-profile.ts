import type { Locale } from '../locales.ts';
import type { AdminGuest } from '../services/admin-api.ts';
import type { AgeRange } from '../services/ageRanges.ts';
import type { VisitTrack } from '../services/visit-track.ts';
import type { VisitStatus } from '../services/visitStateMachine.ts';

/** One of a guest's visits, as their profile reads it. Timestamps are ISO strings. */
export type GuestProfileVisit = {
	id: string;
	marketEventId: string;
	/** The `YYYY-MM-DD` date of the visit. */
	visitDate: string;
	status: VisitStatus;
	track: VisitTrack;
	queuePosition: number | null;
	priorityNumber: number | null;
	queueFront: boolean;
	queueOrder: number | null;
	householdSize: number;
	childrenCount: number;
	seniorsCount: number;
	ageRange: AgeRange | null;
	/** How the visit was made: `self` from the guest's phone, `admin` by a worker. */
	source: string;
	calledAt: string | null;
	servedAt: string | null;
	createdAt: string;
};

/**
 * One guest's record, as `GET /api/admin/guests/:guestId` returns it: who they are and every visit,
 * newest first. Race and ethnicity are never part of it — they leave the guest table only as
 * aggregate counts.
 */
export type GuestProfileRecord = {
	guestId: string;
	firstName: string;
	lastName: string;
	pronunciation: string | null;
	phone: string;
	locale: Locale;
	createdAt: string;
	/** Whether the guest's record is on a phone, which a claim code would replace. */
	onPhone: boolean;
	/** Whether the guest gets text alerts: they consented and have not since opted out. */
	textAlerts: boolean;
	visits: GuestProfileVisit[];
};

/**
 * Another guest record that is likely the same person, or someone in the same household: linked by
 * a phone number this record or one of its visits used, and — for the same person — the same name.
 * See `GuestReconciliation`.
 */
export type RelatedGuestRecord = {
	guestId: string;
	firstName: string;
	lastName: string;
	phone: string;
	createdAt: string;
	visitCount: number;
	/** The `YYYY-MM-DD` date of the record's latest visit; null when it has none. */
	lastVisitDate: string | null;
	relation: 'same-person' | 'household';
};

/** The household as a visit recorded it. */
export type HouseholdSnapshot = {
	size: number;
	children: number;
	seniors: number;
	ageRange: AgeRange | null;
	/** The date of the visit that recorded it. */
	asOf: string;
};

/**
 * What a guest's profile shows, worked out from their record: counts across visits, the household
 * as last recorded and what it was before it changed, the visit in the session open now, and the
 * visits before it.
 */
export class GuestProfile {
	constructor(private readonly record: GuestProfileRecord) {}

	get guestId(): string {
		return this.record.guestId;
	}

	get firstName(): string {
		return this.record.firstName;
	}

	get lastName(): string {
		return this.record.lastName;
	}

	get name(): string {
		return `${this.record.firstName} ${this.record.lastName}`.trim();
	}

	get initials(): string {
		return [this.record.firstName, this.record.lastName]
			.map((part) => part.trim().charAt(0))
			.join('')
			.toLocaleUpperCase();
	}

	get pronunciation(): string | null {
		return this.record.pronunciation;
	}

	get phone(): string {
		return this.record.phone;
	}

	get locale(): Locale {
		return this.record.locale;
	}

	get onPhone(): boolean {
		return this.record.onPhone;
	}

	get textAlerts(): boolean {
		return this.record.textAlerts;
	}

	/** When the guest was first put on record. */
	get createdAt(): Date {
		return new Date(this.record.createdAt);
	}

	/** Every visit, newest first. */
	get visits(): GuestProfileVisit[] {
		return this.record.visits;
	}

	get visitCount(): number {
		return this.visits.length;
	}

	get servedCount(): number {
		return this.countOf('served');
	}

	get noShowCount(): number {
		return this.countOf('no_show');
	}

	/** The household as the latest visit recorded it; `null` for a guest with no visit. */
	get household(): HouseholdSnapshot | null {
		const [latest] = this.visits;

		return latest ? GuestProfile.snapshotOf(latest) : null;
	}

	/**
	 * The household size before it last changed, and the last visit that recorded it — so the
	 * profile can say "was 3 people through Sep 24". `null` when it has never changed.
	 */
	get previousHousehold(): HouseholdSnapshot | null {
		const current = this.household;
		const earlier = this.visits.find((visit) => visit.householdSize !== current?.size);

		return current && earlier ? GuestProfile.snapshotOf(earlier) : null;
	}

	/** The guest's visit in `marketEventId`, the session open now; `null` when they have none. */
	visitIn(marketEventId: string | null): GuestProfileVisit | null {
		return marketEventId === null
			? null
			: (this.visits.find((visit) => visit.marketEventId === marketEventId) ?? null);
	}

	/** The visits before the one in the session open now, newest first. */
	pastVisits(currentEventId: string | null): GuestProfileVisit[] {
		return this.visits.filter((visit) => visit.marketEventId !== currentEventId);
	}

	/** A visit as the queue's ticket and actions read one: the visit, with who it belongs to. */
	asQueueGuest(visit: GuestProfileVisit): AdminGuest {
		return {
			id: visit.id,
			guestId: this.record.guestId,
			marketEventId: visit.marketEventId,
			firstName: this.record.firstName,
			lastName: this.record.lastName,
			pronunciation: this.record.pronunciation,
			phone: this.record.phone,
			locale: this.record.locale,
			householdSize: visit.householdSize,
			queuePosition: visit.queuePosition,
			priorityNumber: visit.priorityNumber,
			queueFront: visit.queueFront,
			queueOrder: visit.queueOrder,
			calledAt: visit.calledAt,
			status: visit.status,
			track: visit.track,
		};
	}

	private countOf(status: VisitStatus): number {
		return this.visits.filter((visit) => visit.status === status).length;
	}

	private static snapshotOf(visit: GuestProfileVisit): HouseholdSnapshot {
		return {
			size: visit.householdSize,
			children: visit.childrenCount,
			seniors: visit.seniorsCount,
			ageRange: visit.ageRange,
			asOf: visit.visitDate,
		};
	}
}
