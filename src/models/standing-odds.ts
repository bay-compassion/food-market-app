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
export class StandingOdds<Change extends OddsChange = OddsChange> {
	constructor(private readonly changes: readonly Change[]) {}

	weightFor(draw: { id: string | null; registrationOpensAt: Date }): number | null {
		return this.changeFor(draw)?.weight ?? null;
	}

	/** The change that decides a draw. With no session yet, `id` is null and only dates count. */
	changeFor(draw: { id: string | null; registrationOpensAt: Date }): Change | null {
		const covering = this.changes.filter(({ marketEventId, endsAt }) =>
			marketEventId
				? marketEventId === draw.id
				: !endsAt || endsAt.getTime() >= draw.registrationOpensAt.getTime(),
		);

		return covering.reduce<Change | null>(
			(latest, change) =>
				!latest || change.createdAt.getTime() > latest.createdAt.getTime() ? change : latest,
			null,
		);
	}
}
