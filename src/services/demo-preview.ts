import type { AgeRange } from './ageRanges';
import type { VisitStatus } from './visitStateMachine';

/** Credentials issued only for records created by an authenticated demo load. */
export type DemoGuest = {
	id: string;
	firstName: string;
	lastName: string;
	phone: string;
	locale: string;
	deviceToken: string;
	household: {
		ageRange: AgeRange | '';
		householdSize: number;
		childrenCount: number;
		seniorsCount: number;
	} | null;
	visit: { id: string; token: string; status: VisitStatus; queuePosition: number | null } | null;
};

export type DemoRoster = { marketEventId: string; guests: DemoGuest[] };
