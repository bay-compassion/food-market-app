/**
 * Every video this folder makes. Each one is a page (`source`) that the build fills in from the
 * shared stage and writes to `out/<name>.html`; its frames, stills and voice clips go under
 * `out/<name>/`, so rendering one never touches another's.
 *
 * - `soundtrack` is the mixed track the build embeds; `music/mix.cjs` writes it from `arrangement`.
 * - `narration`, when set, is the voiceover: the lines `voice.mjs` records, and the measured length
 *   of each (`timings`), which the page reads at build time to set its pace.
 */
export const videos = {
	'market-day-reel': {
		source: 'reel.src.html',
		soundtrack: 'soundtrack.m4a',
		arrangement: 'music/arrangement.cjs',
	},
	'queue-desk': {
		source: 'queue-desk/queue-desk.src.html',
		soundtrack: 'queue-desk/soundtrack.m4a',
		arrangement: 'queue-desk/arrangement.cjs',
		narration: 'queue-desk/narration.mjs',
		timings: 'queue-desk/narration.timings.json',
	},
};

/** The video named on the command line (its first argument), or the market day reel. */
export function videoFromArgs(argv = process.argv.slice(2)) {
	const name = argv.find((arg) => !arg.startsWith('-') && Number.isNaN(Number(arg)));
	const key = name ?? 'market-day-reel';

	if (!videos[key]) {
		throw new Error(`No video named "${key}". Choose one of: ${Object.keys(videos).join(', ')}`);
	}

	return { name: key, ...videos[key] };
}
