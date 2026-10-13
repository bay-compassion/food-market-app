/**
 * Every video this folder makes. Each one is a page (`source`) that the build fills in from the
 * shared stage and writes to `out/<name>.html`; its frames, stills and voice clips go under
 * `out/<name>/`, so rendering one never touches another's.
 *
 * - `soundtrack` is the mixed track the build embeds; `music/mix.cjs` writes it from `arrangement`.
 * - `narration`, when set, is the voiceover: the lines `voice.mjs` records, and the measured length
 *   of each (`timings`), which the page reads at build time to set its pace.
 */
const guestGuide = {
	source: 'guest-guide/guest-guide.src.html',
	soundtrack: 'guest-guide/soundtrack.m4a',
	arrangement: 'guest-guide/arrangement.cjs',
	narration: 'guest-guide/narration.mjs',
	timings: 'guest-guide/narration.timings.json',
	publish: {
		folder: 'guest-guide',
		interactive: 'guest-guide.html',
		guest: true,
	},
};

export const videos = {
	'guest-guide': guestGuide,
	'guest-guide-zh': {
		...guestGuide,
		locale: 'zh',
		soundtrack: 'guest-guide/zh/soundtrack.m4a',
		narration: 'guest-guide/zh/narration.mjs',
		timings: 'guest-guide/zh/narration.timings.json',
		publish: { ...guestGuide.publish, folder: 'guest-guide/zh' },
	},
	'guest-guide-es': {
		...guestGuide,
		locale: 'es',
		soundtrack: 'guest-guide/es/soundtrack.m4a',
		narration: 'guest-guide/es/narration.mjs',
		timings: 'guest-guide/es/narration.timings.json',
		publish: { ...guestGuide.publish, folder: 'guest-guide/es' },
	},
	'market-day-reel': {
		source: 'reel.src.html',
		soundtrack: 'soundtrack.m4a',
		arrangement: 'music/arrangement.cjs',
		publish: {
			folder: '',
			interactive: 'reel.html',
			title: 'Market Day Reel',
			heading: 'A simpler way to welcome every neighbor.',
			summary: "A one-minute look at how The Bay Compassion's community food market runs its line.",
			description:
				"Guests register on their own phones in eight languages, and the day's lottery gives everyone the same chance. Volunteers then call each number from a phone at the desk, and it lights up on the room display and on the guest's phone at the same moment.",
			sound: 'Turn the sound on for the soundtrack.',
		},
	},
	'queue-desk': {
		source: 'queue-desk/queue-desk.src.html',
		soundtrack: 'queue-desk/soundtrack.m4a',
		arrangement: 'queue-desk/arrangement.cjs',
		narration: 'queue-desk/narration.mjs',
		timings: 'queue-desk/narration.timings.json',
		publish: {
			folder: 'queue-desk',
			interactive: 'queue-desk.html',
			title: 'Queue Desk Guide',
			heading: 'A guide to the queue desk.',
			summary: 'A narrated guide for volunteers welcoming guests on market day.',
			description:
				'Learn how to call guests, print name tags, keep the line moving, handle late arrivals, add a guest, and close the session.',
			sound: 'Turn the sound on for the narration. The voice is AI-generated.',
		},
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
