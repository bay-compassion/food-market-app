/**
 * The types the stage, the pages, and the Node scripts that drive a built page all share: the
 * narration as written and as recorded, and the `window.reel` handle a page exposes for capture,
 * stills, mixing and checks. Types only, so the build's type stripping leaves nothing behind.
 */

/** Where a video's voice comes from; see `voice.ts`. */
export type Voice =
	| { source: 'kokoro'; name: string; speed: number; language: string }
	| { source: 'say'; name: string; rate?: number }
	| { source: 'recorded'; folder: string };

/** One line of a video's voiceover, as its `narration.ts` writes it. */
export interface NarrationLine {
	id: string;
	/** Seconds of quiet before the line, after the one before it ends. */
	pause: number;
	text: string;
	/** Starts a chapter at this line; its title is the page's own. */
	chapter?: string;
	/** What `say` reads instead of `text`, where macOS mispronounces it. */
	say?: string;
	/**
	 * The dashboard labels the line says aloud, by their keys in `src/adminLocales.ts`. The build
	 * checks each label's current English text is still in `text`, so a relabelled button can't
	 * leave the recorded voice naming one the screen no longer has.
	 */
	names?: string[];
}

/** A line with the measured length of its recording, which paces the page. */
export interface TimedLine extends NarrationLine {
	duration: number;
}

/** A line placed on the timeline: `t` is when it starts. */
export interface Cue extends TimedLine {
	t: number;
}

export interface Chapter {
	key: string;
	t: number;
}

/** What `voice.ts` writes and the build reads back: the voice, and each line's recording. */
export interface NarrationTimings {
	voice?: Voice;
	lines: Record<string, { text: string; duration: number }>;
}

/** The handle a built page exposes as `window.reel`, for the scripts that drive it. */
export interface Reel {
	tl: gsap.core.Timeline;
	END: number;
	cues: Cue[];
	chapters: Chapter[];
	seek: (seconds: number) => void;
	setSound: (on: boolean) => Promise<void>;
	/** The soundtrack, loaded as far as its length; void where the browser can't play it. */
	soundtrackReady: Promise<HTMLAudioElement | void>;
	/** Loads the voice-only track the player plays with the music off; null for the reel. */
	loadVoiceTrack: () => Promise<HTMLAudioElement | null>;
	/**
	 * Resolves once the page shows the moment the playhead is on, fully drawn. Capture and stills
	 * wait on it after every seek; a page whose screens all draw at once has nothing to wait for.
	 */
	settle: () => Promise<void>;
}

declare global {
	interface Window {
		reel: Reel;
	}
}

/**
 * One part of a soundtrack: a loop by name, or a recorded line by id, from `start` to `end` on the
 * timeline. `db` is its level against the loop's own; `rate` plays it faster or slower; `offset`
 * starts partway into it; `lowpass` sweeps a filter across it; `duck` drops it that many dB under
 * every line of narration; `pan` and `verb` place it in the room.
 */
export type SoundPart = ({ loop: string; voice?: never } | { voice: string; loop?: never }) & {
	start: number;
	end: number;
	db: number;
	rate?: number;
	offset?: number;
	fadeIn?: number;
	fadeOut?: number;
	lowpass?: [number, number];
	duck?: number;
	pan?: number;
	verb?: number;
};

/** A video's soundtrack, from its length and its narration's cues. */
export type Arrangement = (end: number, cues: Cue[]) => SoundPart[];
