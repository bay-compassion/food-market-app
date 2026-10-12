/**
 * The soundtrack, as which Apple Loop plays when. Times are seconds into the reel; `db` is the
 * loop's level against its own (Apple balances its loops to sit together at 0 dB); `rate` plays a
 * loop faster or slower; `offset` starts partway into it; `lowpass` sweeps a filter across the part.
 *
 * At 120 bpm a bar is 2 s and every loop is 4 bars (8 s), so sections fall on even seconds. Kyle's
 * drums are recorded at 110 bpm and played back 120/110 faster, which turns 8 bars into 16 s.
 */
const KYLE = 120 / 110;

module.exports = (END) => {
	// The closing card lands at about 59.9 s.
	const outro = 60;
	const G = 'Moving Pictures Acoustic Guitar';
	const R = 'Moving Pictures Rhythm Guitar';
	const B = 'Moving Pictures Bass';
	const S = 'Moving Pictures Synth';

	return [
		// Title and the first guest: the synth bed alone, then the acoustic guitar as the phone appears.
		{
			loop: S,
			start: 0,
			end: outro + 4,
			db: -6,
			fadeIn: 3,
			fadeOut: 3,
			lowpass: [900, 6000],
			verb: 0.5,
		},
		{ loop: G, start: 4, end: END, db: 0, fadeIn: 0.3, fadeOut: END - outro - 1, pan: -0.1 },
		// The window runs down: bass and Kyle's intro groove come in under the fast-forward.
		{ loop: B, start: 14, end: 18, db: -5, fadeIn: 1.5 },
		{ loop: 'Kyle - Intro', start: 14, end: 18, db: 0, rate: KYLE, fadeIn: 1.5, fadeOut: 0.3 },
		// The draw: the band drops out and the guitar carries it; the rhythm guitar swells back in.
		{ loop: R, start: 18, end: 22, db: -8, fadeIn: 3.6, pan: 0.25, verb: 0.5 },
		// Service: the full band.
		{ loop: B, start: 22, end: outro, db: -3 },
		{ loop: 'Kyle - Verse', start: 22, end: 30, db: 0, rate: KYLE },
		{ loop: R, start: 22, end: 30, db: -6, pan: 0.3 },
		// Late arrivals: the rhythm guitar sits out and Kyle moves to the bridge groove.
		{ loop: 'Kyle - Bridge', start: 30, end: 38, db: 0, rate: KYLE },
		{ loop: 'Kyle - Verse', start: 38, end: 46, db: 0, rate: KYLE, offset: 8 },
		{ loop: R, start: 38, end: outro, db: -6, pan: 0.3 },
		// Steady flow: the chorus groove and a shaker on top.
		{ loop: 'Kyle - Chorus', start: 46, end: outro, db: 0, rate: KYLE },
		{ loop: 'Remix Shaker 01', start: 46, end: outro, db: -3, pan: 0.4, fadeIn: 2 },
		// Home: Kyle's outro hit, then the guitar and synth ring out under the closing card.
		{ loop: 'Kyle - Outro', start: outro, end: outro + 2.2, db: 0, rate: KYLE, fadeOut: 1.2 },
		{ loop: B, start: outro, end: outro + 2, db: -4, fadeOut: 1.5 },
	];
};
