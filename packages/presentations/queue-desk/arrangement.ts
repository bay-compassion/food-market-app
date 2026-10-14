/**
 * The queue desk video's soundtrack: the narration, over a quiet bed from the same Moving Pictures
 * kit as the market day reel (G major, 120 bpm). The bed is fuller under the title and the closing
 * card, and ducks under every line of narration, so the voice always sits on top.
 *
 * Placed from the narration's cues rather than fixed seconds, so rewording a line moves the music
 * with it. `cues` are `{ id, t, duration }`, read from the built page by `music/mix.ts`.
 */
import type { Arrangement } from '../stage/reel.ts';

const arrangement: Arrangement = (END, cues) => {
	const last = cues[cues.length - 1]!;
	const outro = last.t + last.duration;
	const G = 'Moving Pictures Acoustic Guitar';
	const S = 'Moving Pictures Synth';
	const B = 'Moving Pictures Bass';

	return [
		// The bed: synth throughout, the guitar on top, both dipping under the voice.
		{
			loop: S,
			start: 0,
			end: END,
			db: -9,
			fadeIn: 3,
			fadeOut: 4,
			lowpass: [1200, 3000],
			verb: 0.5,
			duck: 8,
		},
		{ loop: G, start: 0.5, end: END, db: -5, fadeIn: 1.5, fadeOut: 4, pan: -0.1, duck: 13 },
		// The bass joins once the line is on screen and leaves for the closing card.
		{ loop: B, start: cues[3]!.t - 2, end: outro, db: -11, fadeIn: 4, fadeOut: 2, duck: 8 },
		// The narration itself, dry and centred.
		...cues.map((cue) => ({
			voice: cue.id,
			start: cue.t,
			end: cue.t + cue.duration + 0.05,
			db: 0,
			verb: 0,
		})),
	];
};

export default arrangement;
