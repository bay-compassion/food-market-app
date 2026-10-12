# Market day reel

A one-minute motion piece showing the app at work: a guest registering on their phone, the lottery
draw, and the line moving through the room display and the volunteer's queue desk. The screens are
simplified recreations of the real ones, built from the app's own design tokens and translations.

The reel is a single HTML page animated with [GSAP](https://gsap.com). The video is that page
photographed one frame at a time, so editing the HTML and re-rendering gives a new video with the
same timing.

## Files

| File                    | What it is                                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| `reel.src.html`         | The reel: styles, screen markup, the beat script, and the timeline.                           |
| `build.mjs`             | Builds `out/market-day-reel.html`, inlining guest copy from `src/locales.ts`, logos, music.   |
| `stills.cjs`            | Screenshots chosen moments and reports page errors, for a quick check.                        |
| `capture.cjs`           | Renders every frame to `out/frames/` at 30 fps.                                               |
| `encode.swift`          | Turns the frames and the soundtrack into an MP4 with AVFoundation.                            |
| `soundtrack.m4a`        | The mixed soundtrack the build embeds.                                                        |
| `music/arrangement.cjs` | Which Apple Loop plays when, at what level, for the soundtrack.                               |
| `music/mix.cjs`         | Mixes the arrangement into `soundtrack.m4a`.                                                  |
| `music/catalog.py`      | Lists every installed Apple Loop with its key, tempo, instrument and mood, for choosing more. |

Everything generated goes to `out/`, which is ignored.

## Editing

Most changes are to the beat script in `reel.src.html`: a list of `at(time, (s) => { … })` calls,
each changing the shared state at a moment — who is called, which caption shows, where each phone
sits. The phones, the room display and the queue desk all draw from that state, so moving one beat
retimes it on every screen at once. Captions are the `cap('Eyebrow', 'Headline', 'Subline')` calls
inside the beats; guests are `PEOPLE` and `REG_ORDER`; positions on the 1920×1080 stage are in
`layoutOf()`. Guest-facing text comes from `src/locales.ts` at build time, so a copy change in the
app reaches the reel on the next build.

Open the built page and press **Dev** in its controls (or add `#dev` to its address) to edit
against it:

```bash
node docs/reel/build.mjs
open -a "Google Chrome" "file://$PWD/docs/reel/out/market-day-reel.html#dev"
```

Along the bottom is GSAP's GSDevTools — scrubber, play speed, loop, and in/out markers. Down the
side is every beat: its time, what it changes, and the line in `reel.src.html` that schedules it.
The current beat follows the playhead, and clicking one jumps there. Scrub until a moment feels
off, edit that line, rebuild, reload.

Without `#dev` the page plays on its own, with a scrubber and a sound toggle.

## Rendering the video

```bash
node docs/reel/build.mjs
node docs/reel/stills.cjs 12 27.5 40
node docs/reel/capture.cjs
swiftc -O docs/reel/encode.swift -o docs/reel/out/encode
docs/reel/out/encode docs/reel/out/frames docs/reel/soundtrack.m4a docs/reel/out/market-day-reel.mp4
```

`capture.cjs` takes about five minutes; encoding takes under a minute. Pass a bitrate as a fifth
argument to `encode` for a smaller copy — `2900000` comes in under 25 MB. The scripts need
`npx playwright install chromium` once, and encoding needs macOS.

## The soundtrack

The music is arranged from GarageBand's Apple Loops: the _Moving Pictures_ kit (acoustic guitar,
rhythm guitar, bass, synth bed, G major, 120 bpm) with Kyle, GarageBand's pop-rock drummer, whose
loops are played back faster to match the tempo. Its sections follow the reel's: guitar alone for
registration, the band building under the countdown, a breakdown for the draw, the full band once
the line moves, and the drummer's outro under the closing card.

To change it, edit `music/arrangement.cjs`, then mix and rebuild:

```bash
node docs/reel/music/mix.cjs
node docs/reel/build.mjs
```

Mixing needs GarageBand's loop library installed. Apple's licence allows the mixed track to ship in
the reel, but not the loops on their own, so the decoded loops stay in `out/` and are never
committed.

## Guest messaging

The reel follows the same rules as guest copy: everyone in the lottery has the same chance and not
everyone gets a number (three registrants are not placed); nothing mentions standby or lottery
weighting; guests are sent to the check-in desk; a late guest's number stays called and their board
warms to yellow, with no penalty implied. All names are fictional, and the one phone number uses the
reserved 555-01xx range.
