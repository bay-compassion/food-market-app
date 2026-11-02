/** One saved change to a person's odds. A weight of 1 holds them at Standard on purpose. */
export type OddsChange = {
	weight: number;
	/** Set when the change covers one session only. */
	marketEventId: string | null;
	/** Set when the change stops applying after a date. */
	endsAt: Date | null;
	createdAt: Date;
};

/**
 * What a person's saved changes mean for a given draw. The newest change that covers the draw wins,
 * so a one-Saturday change falls back to whatever stood before it once that Saturday has passed.
 */
export class StandingOdds {
	constructor(private readonly changes: readonly OddsChange[]) {}

	weightFor(draw: { id: string; registrationOpensAt: Date }): number | null {
		const covering = this.changes.filter(({ marketEventId, endsAt }) =>
			marketEventId
				? marketEventId === draw.id
				: !endsAt || endsAt.getTime() >= draw.registrationOpensAt.getTime(),
		);
		const newest = covering.reduce<OddsChange | null>(
			(latest, change) =>
				!latest || change.createdAt.getTime() > latest.createdAt.getTime() ? change : latest,
			null,
		);

		return newest?.weight ?? null;
	}
}
