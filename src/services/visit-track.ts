/**
 * How a guest takes part in a session.
 *
 * - `lottery` — every guest who registers: the draw, then a number and a place in line.
 * - `premarket` — a volunteer who shops before the line opens. Their place is guaranteed, so they
 *   never enter the draw, never get a number, and take nothing from the line's capacity.
 * - `postmarket` — a guest on standby: joined at the market once shopping started, with an `S`
 *   number in the order they joined and no guarantee of food. Admitted after the main line, never
 *   marked a no-show, and outside the line's capacity. See `docs/standby.md`.
 */
export type VisitTrack = 'lottery' | 'premarket' | 'postmarket';

export const visitTracks: VisitTrack[] = ['lottery', 'premarket', 'postmarket'];

export function isVisitTrack(value: unknown): value is VisitTrack {
	return visitTracks.some((track) => track === value);
}
