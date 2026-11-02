/** One anonymous completed shopping household. Voided rows remain available for correction history. */
export type HouseholdServiceEntry = {
	id: string;
	marketEventId: string;
	householdSize: number;
	createdAt: string;
	updatedAt: string;
	createdBy: string | null;
	updatedBy: string | null;
	voidedAt: string | null;
	version: number;
};

export type HouseholdServiceSubmission = {
	id: string;
	marketEventId: string;
	householdSize: number;
};
export type HouseholdServiceCorrection = {
	version: number;
	householdSize: number;
	voided: boolean;
};
