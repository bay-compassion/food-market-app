/**
 * How a guest takes part in a session.
 *
 * - `lottery` — every guest who registers: the draw, then a number and a place in line.
 * - `premarket` — a volunteer who shops before the line opens. Their place is guaranteed, so they
 *   never enter the draw, never get a number, and take nothing from the line's capacity.
 */
export type VisitTrack = 'lottery' | 'premarket';

export const visitTracks: VisitTrack[] = ['lottery', 'premarket'];

export function isVisitTrack(value: unknown): value is VisitTrack {
	return visitTracks.some((track) => track === value);
}
