/**
 * Every video this package makes. Each one is a folder holding its page (`page.html` for the stage
 * markup and styles, `page.ts` for its beat script) that the build fills in from the shared stage
 * and writes to `out/<name>.html`; its frames, stills and voice clips go under `out/<name>/`, so
 * rendering one never touches another's.
 *
 * - `soundtrack` is the mixed track the build embeds; `music/mix.ts` writes it from `arrangement`.
 *   A narrated video also gets `voiceTrack`, the same mix without its loops, which the player
 *   switches to when the viewer turns the music off.
 * - `narration`, when set, is the voiceover: the lines `voice.ts` records, and the measured length
 *   of each (`timings`), which the page reads at build time to set its pace.
 * - `frame`, when set, puts part of the app itself on the page, built and inlined with it: the
 *   guest app on the page's phone (`phone/`), or the admin dashboard (`admin/`).
 */
export interface Publication {
	/** Where the landing page goes under the site root; relative to the portfolio landing page. */
	folder: string;
	/** The presentation's own file name, beside the landing page. */
	interactive: string;
	/** A guest presentation takes its landing page copy from `guestView.presentation`. */
	guest?: boolean;
	title?: string;
	heading?: string;
	summary?: string;
	description?: string;
	sound?: string;
	/** What the screens in the presentation are; by default, simplified recreations of the app. */
	screens?: string;
	/** The page turns portrait on a phone (9:16 below 600px), so its player does too. */
	portrait?: boolean;
	open?: string;
	download?: string;
	more?: string;
}

export interface VideoDefinition {
	/** The video's folder, holding `page.html` and `page.ts`. */
	folder: string;
	soundtrack: string;
	/** The narration alone, mixed as in `soundtrack`; set exactly when `narration` is. */
	voiceTrack?: string;
	arrangement: string;
	narration?: string;
	timings?: string;
	frame?: 'phone' | 'admin';
	publish: Publication;
}

export const videos = {
	'guest-guide': {
		folder: 'guest-guide',
		soundtrack: 'guest-guide/soundtrack.m4a',
		voiceTrack: 'guest-guide/voice.m4a',
		arrangement: 'guest-guide/arrangement.ts',
		narration: 'guest-guide/narration.ts',
		timings: 'guest-guide/narration.timings.json',
		frame: 'phone',
		publish: {
			folder: 'presentations/guest-guide',
			interactive: 'guest-guide.html',
			guest: true,
		},
	},
	'market-day-reel': {
		folder: 'market-day-reel',
		soundtrack: 'market-day-reel/soundtrack.m4a',
		arrangement: 'market-day-reel/arrangement.ts',
		publish: {
			folder: 'presentations/market-day-reel',
			interactive: 'reel.html',
			title: 'Market Day Reel',
			heading: 'Giving Guests Time to Register for a Shopping Place',
			summary:
				'A one-minute walkthrough of registration and shopping places at The Bay Compassion.',
			description:
				'At this community food market, guests choose their groceries. The new app gives them a registration window before selection rather than a rush to claim the first available places. This walkthrough shows registration, a lottery result, and volunteers welcoming selected guests to shop.',
			sound: 'Turn the sound on for the soundtrack.',
		},
	},
	'queue-desk': {
		folder: 'queue-desk',
		soundtrack: 'queue-desk/soundtrack.m4a',
		voiceTrack: 'queue-desk/voice.m4a',
		arrangement: 'queue-desk/arrangement.ts',
		narration: 'queue-desk/narration.ts',
		timings: 'queue-desk/narration.timings.json',
		publish: {
			folder: 'presentations/queue-desk',
			interactive: 'queue-desk.html',
			title: 'Queue Desk Guide',
			heading: 'A Guide to the Queue Desk',
			summary: 'A narrated guide for volunteers welcoming guests on market day.',
			description:
				'Learn how to call guests, print name tags, keep the line moving, handle late arrivals, add a guest, and close the session.',
			sound: 'Turn the sound on for the narration. The voice is AI-generated.',
		},
	},
	'admin-guide': {
		folder: 'admin-guide',
		soundtrack: 'admin-guide/soundtrack.m4a',
		voiceTrack: 'admin-guide/voice.m4a',
		arrangement: 'admin-guide/arrangement.ts',
		narration: 'admin-guide/narration.ts',
		timings: 'admin-guide/narration.timings.json',
		frame: 'admin',
		publish: {
			folder: 'presentations/admin-guide',
			interactive: 'admin-guide.html',
			title: 'Market Dashboard Guide',
			heading: 'A Guide to the Market Dashboard',
			summary: 'A narrated guide for staff running market day from the admin dashboard.',
			description:
				'Learn how the schedule sets up each market, how to steer registration and the lottery, add a guest by hand, send a broadcast, find past records and reports, and close the session.',
			sound: 'Turn the sound on for the narration. The voice is AI-generated.',
			screens: 'The phone runs the real admin dashboard, with fictional guests.',
			portrait: true,
		},
	},
} satisfies Record<string, VideoDefinition>;

export type VideoName = keyof typeof videos;

export type Video = VideoDefinition & { name: VideoName };

const isVideoName = (name: string): name is VideoName => Object.hasOwn(videos, name);

/** The video named on the command line (its first argument), or the market day reel. */
export function videoFromArgs(argv = process.argv.slice(2)): Video {
	const name = argv.find((arg) => !arg.startsWith('-') && Number.isNaN(Number(arg)));
	const key = name ?? 'market-day-reel';

	if (!isVideoName(key)) {
		throw new Error(`No video named "${key}". Choose one of: ${Object.keys(videos).join(', ')}`);
	}

	return { name: key, ...videos[key] };
}

/** Every video, with its name. */
export function allVideos(): Video[] {
	return Object.entries(videos).map(([name, video]) => ({ name: name as VideoName, ...video }));
}
