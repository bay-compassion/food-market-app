/** The steward area's API, imported only from its own lazily loaded chunk. */

export const oddsWeights = [1, 2, 5] as const;
export type OddsWeight = (typeof oddsWeights)[number];

export const oddsScopes = ['next', 'weeks', 'open'] as const;
export type OddsScope = (typeof oddsScopes)[number];

export const oddsReasons = ['Repeated misses', 'Correcting an error', 'Staff judgment'] as const;
export type OddsReason = (typeof oddsReasons)[number];

export type OddsChangeSubmission = {
	weight: OddsWeight;
	scope: OddsScope;
	reason: OddsReason;
	note?: string;
};

/** Everyone in a draw holding the same odds. */
export type StewardTier = { weight: number; entries: number; placed: number };

export type StewardDraw = {
	id: string;
	opensAt: string;
	spots: number;
	tiers: StewardTier[];
	/** The pool by what the automatic rule would have given it; empty for an older draw. */
	suggestedTiers: StewardTier[];
	/** Saved odds existed, but this draw ran on the visits' own weights because settling failed. */
	oddsSkipped: boolean;
};

export type StewardUpcomingDraw = {
	id: string;
	status: string;
	opensAt: string;
	spots: number;
	tiers: StewardTier[];
	suggestedTiers: StewardTier[];
	/** `StewardPerson.id` of everyone entered so far. */
	entrants: string[];
};

export type StewardSetting = {
	weight: number;
	scope: OddsScope;
	endsAt: string | null;
	reason: string;
	actorName: string | null;
	createdAt: string;
};

export type StewardPerson = {
	/** Their newest guest record, which is what a change is saved against. */
	id: string;
	name: string;
	phoneLast4: string;
	householdSize: number | null;
	/** How many guest records were matched as this person. */
	records: number;
	outcomes: { drawId: string; chance: number; won: boolean }[];
	/** The odds they would hold in the next draw. */
	weight: number;
	setting: StewardSetting | null;
};

export type StewardChange = {
	id: string;
	personId: string;
	guestName: string;
	previousWeight: number;
	weight: number;
	scope: OddsScope;
	endsAt: string | null;
	reason: string;
	note: string | null;
	actorName: string | null;
	createdAt: string;
};

export type StewardLedgerResponse = {
	/** Oldest first. */
	draws: StewardDraw[];
	upcoming: StewardUpcomingDraw | null;
	people: StewardPerson[];
	/** Newest first. */
	changes: StewardChange[];
};

export class StewardApi {
	constructor(private readonly getAccessToken: () => Promise<string>) {}

	readLedger(): Promise<StewardLedgerResponse> {
		return this.request('/api/steward/ledger');
	}

	async saveOdds(personId: string, change: OddsChangeSubmission): Promise<void> {
		await this.request(`/api/steward/people/${personId}/odds`, change);
	}

	private async request<T>(path: string, payload?: unknown): Promise<T> {
		const token = await this.getAccessToken();
		const response = await fetch(
			path,
			payload === undefined
				? { headers: { Authorization: `Bearer ${token}` } }
				: {
						method: 'POST',
						headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
						body: JSON.stringify(payload),
					},
		);
		const body = (await response.json().catch(() => null)) as { error?: string } | null;

		if (!response.ok) {
			throw new Error(body?.error ?? 'The request could not be completed.');
		}

		return body as T;
	}
}
