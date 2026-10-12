# Videos

Motion pieces showing the app at work, built from its own design tokens and translations:

- **Market day reel** (`market-day-reel`): one minute, no words. A guest registers on their phone,
  the lottery is drawn, and the line moves through the room display and the volunteer's queue desk.
- **Queue desk** (`queue-desk`): about three and a quarter minutes, narrated. A training video for
  the volunteer running `/queue`: calling, name tags, serving, late arrivals, no-shows, adding a
  guest by hand, and closing the session.

Each video is a single HTML page animated with [GSAP](https://gsap.com). The video is that page
photographed one frame at a time, so editing the HTML and re-rendering gives a new video with the
same timing. The screens are simplified recreations of the real ones.

## Files

| File                                | What it is                                                                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `videos.mjs`                        | Every video: its page, soundtrack, arrangement and narration. The scripts take a video's name.                             |
| `stage.css`, `stage.js`             | Shared by every video: styles, guest phone, room display, captions, the player and `#dev` mode.                            |
| `reel.src.html`                     | The market day reel: its screens, beat script, and timeline.                                                               |
| `queue-desk/queue-desk.src.html`    | The queue desk video: a closer recreation of `/queue`, its beat script, and timeline.                                      |
| `queue-desk/narration.mjs`          | The queue desk voiceover, line by line, and where the voice comes from.                                                    |
| `queue-desk/narration.timings.json` | How long each recorded line runs, written by `voice.mjs`; the build paces the page from it.                                |
| `build.mjs`                         | Builds `out/<name>.html`, inlining the stage, copy from `src/locales.ts` and `src/adminLocales.ts`, logos, timings, music. |
| `voice.mjs`                         | Records a video's narration, one clip per line, and measures each.                                                         |
| `stills.cjs`                        | Screenshots chosen moments and reports page errors, for a quick check.                                                     |
| `capture.cjs`                       | Renders every frame to `out/<name>/frames/` at 30 fps.                                                                     |
| `encode.swift`                      | Turns the frames and the soundtrack into an MP4 with AVFoundation.                                                         |
| `render.mjs`                        | Runs all of the above in order, from narration to MP4.                                                                     |
| `soundtrack.m4a`                    | The reel's mixed soundtrack; `queue-desk/soundtrack.m4a` is the queue desk's, voice included.                              |
| `music/arrangement.cjs`             | Which Apple Loop plays when, at what level, for the reel; `queue-desk/arrangement.cjs` for the other.                      |
| `music/mix.cjs`                     | Mixes a video's arrangement, and its narration, into its soundtrack.                                                       |
| `music/catalog.py`                  | Lists every installed Apple Loop with its key, tempo, instrument and mood, for choosing more.                              |

Everything generated goes to `out/`, which is ignored.

## Editing

Most changes are to a page's beat script: a list of `at(time, (s) => { … })` calls, each changing
the shared state at a moment — who is called, which caption shows, which ticket is open. Every
screen draws from that state, so moving one beat retimes it on every screen at once. Captions are
the `cap('Eyebrow', 'Headline', 'Subline')` calls inside the beats. Guest-facing text comes from
`src/locales.ts` and the queue desk's labels from `src/adminLocales.ts` at build time, so a copy
change in the app reaches the videos on the next build.

In the reel, beats are placed in seconds; guests are `PEOPLE` and `REG_ORDER`, and positions on
the 1920×1080 stage are in `layoutOf()`. In the queue desk video, beats hang off the narration:
`C('serve', 0.62)` is 62% of the way through the line `serve`, and `E('serve')` its end. Taps are
`tap(time, key, then)`, and the narration points at something with `spot(time, key)`; `key` names an
element in the desk's markup (see `marks()`).

Open a built page and press **Dev** in its controls (or add `#dev` to its address) to edit against
it:

```bash
node docs/reel/build.mjs queue-desk
open -a "Google Chrome" "file://$PWD/docs/reel/out/queue-desk.html#dev"
```

Along the bottom is GSAP's GSDevTools — scrubber, play speed, loop, and in/out markers. Down the
side is every beat: its time, what it changes, and the line in the page's source that schedules it.
The current beat follows the playhead, and clicking one jumps there. Scrub until a moment feels
off, edit that line, rebuild, reload.

Without `#dev` the page plays on its own, with a scrubber and a sound toggle. Leaving the name off
any script means the market day reel.

## Rendering a video

```bash
node docs/reel/render.mjs queue-desk
```

That records the narration, builds, mixes, rebuilds, captures every frame, and encodes
`out/queue-desk.mp4`. Add `--picture-only` to keep the committed timings and soundtrack, which is
all a change to the pictures needs, and is the only way to render without GarageBand's loops. The
steps on their own:

```bash
node docs/reel/voice.mjs queue-desk
node docs/reel/build.mjs queue-desk
node docs/reel/music/mix.cjs queue-desk
node docs/reel/build.mjs queue-desk
node docs/reel/stills.cjs queue-desk 30 52 110
node docs/reel/capture.cjs queue-desk
swiftc -O docs/reel/encode.swift -o docs/reel/out/encode
docs/reel/out/encode docs/reel/out/queue-desk/frames docs/reel/queue-desk/soundtrack.m4a docs/reel/out/queue-desk.mp4
```

`capture.cjs` takes about five minutes a minute of video; encoding takes under a minute. Pass a
bitrate as a fifth argument to `encode` for a smaller copy — `2900000` brings the reel under 25 MB.
The scripts need `npx playwright install chromium` once, and recording and encoding need macOS.

## Narration

`queue-desk/narration.mjs` holds the voiceover, a line at a time, each with an id and the pause
before it. The page plays the lines back to back and hangs its beats off them, so rewording a line
retimes the video around it: change the text, then run `render.mjs` (or `voice.mjs`, `build.mjs`
and `mix.cjs`). Until a changed line is recorded again, the build times it on an estimate and says
so. The script names the screen's real labels, and describes only what the app does — check the
components in `src/components/queue/` before changing what it says a button does.

Where the voice comes from is the `voice` setting at the top of that file:

- **`{ source: 'say', name: 'Samantha' }`** — macOS's text to speech. Quick for drafting the pace,
  but **not for a video anyone else sees**: Apple's macOS licence allows its system voices only in
  personal, non-commercial projects, and excludes recording or publishing them in a non-profit or
  public setting. A video voiced this way is a draft.
- **`{ source: 'recorded', folder: 'queue-desk/voice' }`** — a person reads the lines. Record each
  as its own file named for its id (`welcome.m4a`, `open.m4a`, … — `.wav`, `.aiff` and `.mp3` work
  too) in that folder, and commit them. `voice.mjs` lists any line still missing. Voice Memos on a
  phone in a quiet room is enough; leave half a second of silence at most at either end.

The market day reel has no narration.

## Publishing

The reel is hosted on GitHub Pages at <https://bay-compassion.github.io/food-market-app/>: a
landing page (`site.html`) with the video, the interactive page at `reel.html`, and a poster
frame. After rendering, encode the web copy and publish:

```bash
docs/reel/out/encode docs/reel/out/market-day-reel/frames docs/reel/soundtrack.m4a docs/reel/out/market-day-reel-web.mp4 2900000
node docs/reel/publish.mjs --dry-run
node docs/reel/publish.mjs
```

`--dry-run` assembles the site in `out/site/` to look at first. A real publish force-pushes it as
a single commit to the `gh-pages` branch, which shares no history with `main` and is replaced each
time, so old renders never accumulate. Pages deploys it within a minute or two. The site is public.

The queue desk video is for volunteers and is not published there.

## The soundtrack

The music is arranged from GarageBand's Apple Loops: the _Moving Pictures_ kit (acoustic guitar,
rhythm guitar, bass, synth bed, G major, 120 bpm). In the reel, Kyle, GarageBand's pop-rock
drummer, joins it, his loops played back faster to match the tempo; its sections follow the reel's:
guitar alone for registration, the band building under the countdown, a breakdown for the draw, the
full band once the line moves, and the drummer's outro under the closing card. Under the queue desk
narration it is only a bed — synth, guitar and bass — placed from the narration's cues and ducking
under every line.

To change it, edit the video's arrangement, then mix and rebuild:

```bash
node docs/reel/music/mix.cjs queue-desk
node docs/reel/build.mjs queue-desk
```

Mixing needs GarageBand's loop library installed. Apple's licence allows the mixed track to ship in
the videos, but not the loops on their own, so the decoded loops stay in `out/` and are never
committed.

## Guest messaging

The videos follow the same rules as guest copy: everyone in the lottery has the same chance and not
everyone gets a number; nothing mentions standby or lottery weighting; guests are sent to the
check-in desk; a late guest's number stays called and their board warms to yellow, with no penalty
implied. All names are fictional, and phone numbers use the reserved 555-01xx range.
