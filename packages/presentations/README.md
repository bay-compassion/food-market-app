# Presentations and video exports

Read [Shopping for Food Shouldn’t Start with a Race](../../docs/project-purpose.md) before writing
introductions or changing the story these presentations tell. The aim is a more dignified path to a
shopping place, with time to register and better visibility into unmet demand. The walkthroughs
explain the process; their screens and existing narration do not yet tell the full case study.

Motion pieces showing the app at work, built from its own design tokens and translations:

- **Market day reel** (`market-day-reel`): one minute, no words. A guest registers on their phone,
  the lottery is drawn, and the line moves through the room display and the volunteer's queue desk.
- **Queue desk** (`queue-desk`): about three and a quarter minutes, narrated. A training video for
  the volunteer running `/queue`: calling, name tags, serving, late arrivals, no-shows, adding a
  guest by hand, and closing the session.
- **Guest market guide** (`guest-guide`): about three minutes, narrated. A guide for guests opening
  the market page, entering the lottery, following their number, and coming to check-in.
- **Market dashboard guide** (`admin-guide`): about three and a half minutes, narrated. A training
  video for the coordinator running `/admin`: the schedule, registration, the lottery, service,
  adding a guest, broadcasts, records and reports, and closing the session.

Each presentation is an HTML page animated with [GSAP](https://gsap.com), with its soundtrack
embedded. GitHub Pages plays that page directly: publishing needs no frame capture or video
encoding. MP4 exports are still available by photographing the page one frame at a time.
The guest guide's phone is the guest app itself (see [The guest phone](#the-guest-phone)), and the
dashboard guide's phone is the admin dashboard itself (see
[Market dashboard guide](#market-dashboard-guide)); the reel's and the queue desk's screens, and
every room display, are simplified recreations.

## Files

Everything is TypeScript: Node runs the scripts directly, stripping their types, and the build
strips the page code's types the same way. Run the scripts from the repository root.

The package keeps its own `package.json` (its module type and script names) and TypeScript
projects, but it is deliberately not an npm workspace: Netlify's CLI treats a workspace as a
monorepo and would start this package instead of the app under `netlify dev`. The few tools only
it uses (`gsap` for types, `ts-blank-space`) are dev dependencies of the repository instead.

| File                                   | What it is                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `videos.ts`                            | Every video: its folder, soundtrack, arrangement and narration. The scripts take a video's name.             |
| `stage/stage.css`, `stage/stage.ts`    | Shared by every video: styles, guest phone, room display, captions, the player and `#dev` mode.              |
| `stage/reel.ts`                        | Types shared by the pages and the scripts: narration, soundtrack parts, and the page's `window.reel` handle. |
| `strings.ts`                           | The app's copy cut down to what the stage shows, from `src/locales.ts` and `src/adminLocales.ts`.            |
| `market-day-reel/page.html`, `page.ts` | The market day reel: its screens and styles, and its beat script and timeline.                               |
| `queue-desk/page.html`, `page.ts`      | The queue desk video: a closer recreation of `/queue`, its beat script, and timeline.                        |
| `guest-guide/page.html`, `page.ts`     | The guest market guide.                                                                                      |
| `admin-guide/page.html`, `page.ts`     | The market dashboard guide: its beat script, turning each moment into a scene for the admin frame.           |
| `<video>/narration.ts`                 | A narrated video's voiceover, line by line, and where the voice comes from.                                  |
| `<video>/narration.timings.json`       | How long each recorded line runs, written by `voice.ts`; the build paces the page from it.                   |
| `<video>/arrangement.ts`               | Which Apple Loop plays when, at what level, under the video.                                                 |
| `<video>/soundtrack.m4a`               | The video's mixed soundtrack, voice included.                                                                |
| `<video>/voice.m4a`                    | A narrated video's voice alone, mixed as in its soundtrack; the player plays it with the music off.          |
| `build.ts`                             | Builds `out/<name>.html`, inlining the stage, the page, the app's copy, logos, timings and music.            |
| `voice.ts`                             | Records a video's narration, one clip per line, and measures each.                                           |
| `stills.ts`                            | Screenshots chosen moments and reports page errors, for a quick check.                                       |
| `capture.ts`                           | Renders every frame to `out/<name>/frames/` at 30 fps.                                                       |
| `encode.swift`                         | Turns the frames and the soundtrack into an MP4 with AVFoundation.                                           |
| `render.ts`                            | Runs all of the above in order, from narration to MP4.                                                       |
| `publish.ts`, `site.html`              | Assembles the GitHub Pages site around the built pages.                                                      |
| `verify.ts`                            | Browser checks for the built site and players.                                                               |
| `music/mix.ts`                         | Mixes a video's arrangement, and its narration, into its soundtrack.                                         |
| `phone/`                               | The guest phone: the guest app's own screens, driven by the guest guide (see below).                         |
| `admin/`                               | The admin frame: the dashboard's own screens, driven by the dashboard guide (see below).                     |
| `frame-vite.ts`, `stage/frame.ts`      | What the two frame apps share: their Vite build, and the handle a page drives one through.                   |
| `music/catalog.py`                     | Lists every installed Apple Loop with its key, tempo, instrument and mood, for choosing more.                |

Everything generated goes to `out/`, which is ignored.

The page code (`stage/*.ts`, `<video>/page.ts`) runs in the browser as plain scripts, not modules:
the build blanks out its types with [ts-blank-space](https://github.com/bloomberg/ts-blank-space),
which leaves every line where it was, and inlines each one under a `sourceURL`. So it imports
nothing at runtime — only `import type`, which disappears — and a page reaches the stage through
`window.stage`. Its types are checked by `tsconfig.pages.json`; the scripts' by
`tsconfig.scripts.json`. Both run with `pnpm run type-check` from the root.

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

Open a built page with `#dev` in its address to edit against it:

```bash
node packages/presentations/build.ts queue-desk
open -a "Google Chrome" "file://$PWD/packages/presentations/out/queue-desk.html#dev"
```

Along the bottom is GSAP's GSDevTools — scrubber, play speed, loop, and in/out markers. Down the
side is every beat: its time, what it changes, and the line in its `page.ts` that schedules it.
The current beat follows the playhead, and clicking one jumps there. Scrub until a moment feels
off, edit that line, rebuild, reload.

All players start paused, with sound enabled when the viewer presses Play. Their
Full Screen control uses native full screen where available and expands the published embed to
fill the viewport otherwise. Exit with the same control or Escape. On phones, chapter navigation
opens from the Chapter menu. Editing controls are available only in `#dev` mode. Leaving the name
off any script means the market day reel.

## Rendering a video

```bash
node packages/presentations/render.ts queue-desk
```

That records the narration, builds, mixes, rebuilds, captures every frame, and encodes
`out/queue-desk.mp4`. Add `--picture-only` to keep the committed timings and soundtrack, which is
all a change to the pictures needs, and is the only way to render without GarageBand's loops. The
steps on their own:

```bash
node packages/presentations/voice.ts queue-desk
node packages/presentations/build.ts queue-desk
node packages/presentations/music/mix.ts queue-desk
node packages/presentations/build.ts queue-desk
node packages/presentations/stills.ts queue-desk 30 52 110
node packages/presentations/capture.ts queue-desk
swiftc -O packages/presentations/encode.swift -o packages/presentations/out/encode
packages/presentations/out/encode packages/presentations/out/queue-desk/frames \
  packages/presentations/queue-desk/soundtrack.m4a packages/presentations/out/queue-desk.mp4
```

`capture.ts` takes about five minutes a minute of video; encoding takes under a minute. Pass a
bitrate as a fifth argument to `encode` for a smaller copy — `2900000` brings the reel under 25 MB.
The scripts need `pnpm exec playwright install chromium` once, and recording and encoding need macOS.

## Narration

`queue-desk/narration.ts` holds the voiceover, a line at a time, each with an id and the pause
before it. The page plays the lines back to back and hangs its beats off them, so rewording a line
retimes the video around it: change the text, then run `render.ts` (or `voice.ts`, `build.ts`
and `mix.ts`). Until a changed line is recorded again, the build times it on an estimate and says
so. The script names the screen's real labels, and describes only what the app does — check the
components in `src/components/queue/` before changing what it says a button does.

Where the voice comes from is the `voice` setting at the top of that file:

- **`{ source: 'kokoro', name: 'af_heart', speed: 0.96, language: 'en-us' }`** — the queue desk's
  default: a local neural voice with a conversational delivery. Install [uv](https://docs.astral.sh/uv/)
  and [ffmpeg](https://ffmpeg.org/) once; `voice.ts` runs `kokoro.py` with pinned speech dependencies
  and Python 3.12, then matches the clips' loudness at -16 LUFS with a -2 dB true-peak ceiling. The first run
  downloads the runtime and [Kokoro v1.0 model](https://github.com/thewh1teagle/kokoro-onnx)
  (about 340 MB of model and voices) into ignored `out/kokoro/`; later runs work offline.
  No API key or speech-service account is needed. Change `name` to another
  [Kokoro voice](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md), or `speed` to adjust
  the delivery. The [model weights](https://huggingface.co/hexgrad/Kokoro-82M) use Apache-2.0.
- **`{ source: 'say', name: 'Samantha' }`** — macOS's text to speech. Quick for drafting the pace,
  but **not for a video anyone else sees**: Apple's macOS licence allows its system voices only in
  personal, non-commercial projects, and excludes recording or publishing them in a non-profit or
  public setting. A video voiced this way is a draft.
- **`{ source: 'recorded', folder: 'queue-desk/voice' }`** — a person reads the lines. Record each
  as its own file named for its id (`welcome.m4a`, `open.m4a`, … — `.wav`, `.aiff` and `.mp3` work
  too) in that folder, and commit them. `voice.ts` lists any line still missing. Voice Memos on a
  phone in a quiet room is enough; leave half a second of silence at most at either end.

The market day reel has no narration.

### Chapters

A narrated video has chapters, so a viewer can step back to review a part or skip ahead: a chapter
list and previous and next buttons sit beside the playback controls (on a row of their own below
1000 pixels). Previous goes back to the start of the current chapter, or to the one before when the
playhead is within two seconds of its start, as a media player does. A jump keeps playing, or stays
paused, as it was.

**Step by step**, beside them, pauses playback as each chapter ends, holding the finished step on
screen until the viewer presses play — for following along at the desk. It is off by default.

A chapter starts at a narration line marked `chapter: '<key>'` in `narration.ts`, roughly one per
section of the script. The page names it: `CHAPTERS` in `queue-desk/page.ts`, and
`guestView.presentation.chapters` in `src/locales.ts` for the guest guide, in every language. Adding
or moving a chapter changes no audio, so it needs no recording or mixing — rebuild and publish.

## Publishing

GitHub Pages hosts the portfolio overview at
<https://bay-compassion.github.io/food-market-app/>. Every presentation page lives under
`/presentations/`: `market-day-reel/`, `queue-desk/`, `guest-guide/`, and `admin-guide/`.
See [portfolio publishing](../../docs/portfolio.md) for the landing page and screenshot workflow. Each landing page embeds the
GSAP presentation, with playback, restart, sound, and seek controls. It starts paused and
plays once. The pages link to each other and offer the presentation as a downloadable HTML file.

The Netlify app's holding page and Market Closed card share `GuestGuideButton`. It opens only
`/presentations/guest-guide/guest-guide.html` in a sandboxed dialog, on demand, and unmounts it on
close to stop playback. Keep this standalone player free of portfolio or staff-guide navigation:
guests must not be sent to its surrounding `index.html` page. Both placements reuse the existing
GitHub Pages artifact; the Netlify build does not copy or rebuild it.

The **Publish project site** workflow in `.github/workflows/publish-presentations.yml` builds
and deploys automatically when relevant files change on `main`. Commit and push the source,
then merge the change; there is no separate `gh-pages` push. It uses GitHub's Pages artifact
and deployment actions, with the standard workflow token and no extra secrets. Pages must use
**GitHub Actions** as its publishing source, and the `github-pages` environment must allow `main`.

Once the workflow is on `main`, it can also be started in Actions → Publish project site →
Run workflow. Selecting `main` publishes; selecting another branch builds an artifact for
review and skips deployment. Runs are serialized to prevent overlapping site deployments.

For a local preview:

```bash
node packages/presentations/publish.ts
```

This builds every presentation and assembles `out/site/`. `--dry-run` is an equivalent alias;
the script always writes local files without pushing. No MP4, poster frames, Chromium, ffmpeg,
Swift, or GarageBand installation is needed to build the site. The deployed `source.json`
records the source commit and branch.

The workflow uses the committed mixed soundtracks and narration timings. A changed script or
voice setting must be recorded and mixed locally before committing: strict publishing rejects
stale or missing narration timings and missing soundtracks. Updating narration does not require
an MP4 export:

```bash
node packages/presentations/voice.ts queue-desk
node packages/presentations/build.ts queue-desk
node packages/presentations/music/mix.ts queue-desk
node packages/presentations/publish.ts
```

Commit the narration source, measured timings, and mixed soundtrack together. The generated
HTML stays in ignored `out/` and is rebuilt by Actions. All three presentations, including the
volunteer guide, are public. The HTML uses the existing GSAP and Google Fonts CDN resources;
its audio, copy, and logos are embedded.

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
node packages/presentations/music/mix.ts queue-desk
node packages/presentations/build.ts queue-desk
```

Mixing needs GarageBand's loop library installed. Apple's licence allows the mixed track to ship in
the videos, but not the loops on their own, so the decoded loops stay in `out/` and are never
committed.

### How the player plays it

The build embeds `soundtrack.m4a`, and a narrated video's `voice.m4a`, as base64 in the page. The
player turns each into a `blob:` URL and plays it through one hidden `<audio>` element, routed with
`createMediaElementSource` into a gain node that the volume slider sets; the music toggle swaps the
element between the two tracks at the same moment. Play, pause, and deliberate seeks move the
element with the GSAP timeline. During playback the audio keeps the time: if animation frames fall
behind by more than 0.15 s, the timeline catches up without seeking and interrupting the soundtrack.
The player also waits for an outstanding audio play request rather than restarting it each frame.

After building, check delayed audio startup and recovery from dropped animation frames in both
Chromium and WebKit (Safari's engine):

```bash
pnpm exec playwright install chromium webkit
node packages/presentations/verify.ts --playback-only
node packages/presentations/verify.ts --playback-only --webkit
```

The sound is a media element, not Web Audio alone, for two reasons. An iPhone with its ring/silent
switch on mutes Web Audio but plays a media element, so a playing element should keep the guide
audible there; Safari's `navigator.audioSession` is also set to `playback` where it exists. That
the routed element plays with the switch on has not yet been confirmed on a device. If it is
silent, the fallback is to play the element directly on iOS, hiding the volume slider there. And only a playing media element reaches the lock
screen, Control Center, and the keyboard's media keys, which the player answers through the Media
Session API: play and pause, skip ten seconds, seek, and previous and next chapter. The gain node
stays because an iPhone ignores a media element's own `volume`. `#record` never turns the sound on;
`capture.ts` and `encode.swift` take the soundtrack from `<video>/soundtrack.m4a` instead.

## Guest messaging

The app supports adjustable weighting, and the allocation policy is still being developed, so
guest copy no longer says everyone has the same chance — the app's screens dropped it. Some
narration lines and the reel still say it and are due to change with their next audio rebuild.

The videos follow the same rules as guest copy: registering early doesn't change anyone's chances
and not everyone gets a number; nothing claims every guest has the same chance, and nothing
mentions standby or lottery weighting; guests are sent to the
check-in desk; a late guest's number stays called and their board warms to yellow, with no penalty
implied. All names are fictional, and phone numbers use the reserved 555-01xx range.

## Guest market guide

The narrated **Guest Market Guide** (`guest-guide`) follows a guest's phone from opening the
market page to check-in. It uses the queue desk guide's Heart voice, speed, loudness normalization,
and Moving Pictures arrangement, with every visual cue placed from measured clip lengths.
The approximately three-minute presentation includes closed registration, the form, explicit text
message consent, both lottery outcomes, the number and Now calling row, the room display, a call,
a yellow late-arrival reminder, “We missed you,” completed check-in, sending feedback from the app menu, and the help page.
Maya Rivera and Amal Haddad are fictional guests; Amal illustrates not being selected, while Maya
illustrates a selected visit. Luis Herrera shows the returning-guest form. The guide never presents not-selected as a step on the way to selection.

Its phone is the guest app, so its screens are the app's own in all ten languages, and its
captions read the same translations. The language
control also translates playback controls; Arabic and Farsi preserve right-to-left text. New
presentation copy lives in `guestView.presentation` in `src/locales.ts`. Audio remains in English,
as the landing page explains. On phones the same timeline uses a portrait composition, keeping
the phone in focus and placing the room display below it when it appears. The other presentations
keep their existing landscape layouts.

Instruction sources (check these when changing the script):

| Instruction                                                                                   | Current implementation                                                                |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Open the market page, choose a language, Saturday schedule, original phone and no screenshots | `HelpPage`, `GuestLanguageHero`, `help` and `guestView.tour` translations             |
| Closed, registration closed, market underway                                                  | `GuestView`, `GuestNotOpenState`, `GuestRegistrationClosedState`, `GuestServiceState` |
| Identity when needed, household details each visit, Join the lottery                          | `GuestCombinedForm`, `GuestInformationForm`, `GuestLotteryForm`, `RegistrationStore`  |
| Feedback from the three-dot menu, optional name, message and Send                             | `AppBarMenu`, `src/sentry-feedback.ts`, `appBar.feedbackForm`                         |
| Explicit optional text consent                                                                | `NotificationOptIn`, `GuestIdentityCard`, `GuestStore`                                |
| Confirmation, result, ticket number, Now calling, automatic updates                           | `GuestVisitStatus`, `RegisteredVisitStatus`, `WaitingVisitStatus`, `VisitStore`       |
| Check-in, warmth after three minutes, full yellow at ten, missed call, complete               | `CalledVisitStatus`, `LateArrival`, `CompletedVisitStatus`, `guestView.visitStatus`   |

To update and preview without an MP4:

```bash
node packages/presentations/voice.ts guest-guide
node packages/presentations/build.ts guest-guide
node packages/presentations/music/mix.ts guest-guide
node packages/presentations/publish.ts
node packages/presentations/verify.ts
```

`verify.ts` checks embedded audio length and playback controls for every presentation,
every guest narration scene in all ten languages at 320, 390, 600 and 1280 pixels, RTL consent,
that each moment of the guest phone looks the same however it is reached, that the phone makes no
request the guide doesn't answer, and Dev mode. It writes portrait and landscape stills to
`out/guest-guide/review/` for visual review. It needs local Chromium, but it is a local review
step, never a publishing dependency.

### The guest phone

The guest guide's phone runs the guest app: `GuestHome` and `GuestMarketStatus` (the home screen
`GuestView` lays out once the market is loaded), `HelpPage`, and the `AppBar`, with the app's own
stores, stylesheets and theme. A change to a guest screen reaches the guide on its next build, and
the guide can't show a screen the app doesn't have.

`phone/` is a small Vite app that `build.ts` builds and inlines into the guide, which shows it in a
frame inside the drawn phone. The frame is the phone's own window, so the guide controls its
world without touching the page around it:

- **Its clock** (`phone/clock.ts`): the frame's `Date` and timers are faked, set from the scene.
  The registration countdown, the late-arrival warmth and the refresh notice all run on it, in
  step with the timeline however fast capture steps through it.
- **Its server** (`phone/server.ts`): the frame's `fetch` answers `/api/market`, `/api/visit` and
  the text-update endpoints from the scene. Anything else is recorded as unanswered.
- **Its storage**: a fresh in-memory store per phone, seeded with the guest it remembers.

The page's script (`guest-guide/page.ts`) keeps the beat script and turns each moment into a
`PhoneScene` (`phone/scene.ts`): the clock, language, page, who the phone remembers, what is typed,
what the server reports, how far through text sign-up the guest is, and what the narration points
at. `PhoneDevice` (`phone/device.tsx`) applies it through the app's public seams —
`session.applyServerState`, `visit.submit`/`refresh`/`reset`, `registration.updateGuest` — and
taps the screen where only a tap will do: the text-updates sheet is the identity card's own
state. While the timeline plays forward the phone carries on as it is; a seek, a change of
language, or another guest builds a new phone from the scene, so a moment looks the same however
it is reached. Capture, stills and `verify.ts` wait for `window.reel.settle()` after each seek.

What the narration points at and taps are marks (`phone/marks.ts`): names like `household` or
`texts`, found on the real screen by the app's guided-tour anchors (`data-tour`), class names, or
the translated label. The phone scrolls to keep the mark in view and draws the ring and the tap
over it. A new mark is a new case there.

The phone builds without the repository's `.env`, and swaps `src/auth.ts` and
`src/sentry-feedback-trigger.ts` for stand-ins (`phone/stubs/`): it signs nobody in and reports to
no one.

The existing **Publish project site** workflow automatically includes every registry entry. On
`main` it deploys the guest guide at `/presentations/guest-guide/`, alongside the other
presentations and the portfolio overview, with links
among all three. Publishing still uses only committed timings and mixed audio and builds HTML;
it requires no frame capture, transcoding, speech runtime, or music library on the Actions runner.

## Market dashboard guide

The narrated **Market Dashboard Guide** (`admin-guide`) follows a coordinator through one market
day on `/admin`: the Schedule's recurring pattern and next session, Current session from scheduled
through registration, the grace period and the lottery to service, the Queue, adding a guest by
hand, a broadcast, Guest database, Session history and Reports, and closing the session. It uses
the queue desk guide's voice and arrangement. It is English only, as the dashboard is.

The admin side changes more often than the guest screens, so this guide is built to be re-rendered
rather than redrawn: **its phone runs the real `AdminDashboard`**, and a change to a dashboard screen
reaches the guide on its next build.

- `admin/` is a small Vite app, built by `build.ts` like `phone/`, that mounts `AdminDashboard`
  behind the app bar with the confirmation sheet, without Auth0 (`admin/stubs/auth.ts` grants a
  coordinator's permissions: no Dev Mode, no guest-data export).
- `admin/server.ts` answers every request the dashboard makes from the scene — the session as
  `SessionTimeline` derives it, the guests, the schedule, history and a report. It answers reads
  only. Where the narration accepts a confirmation, the frame withdraws the sheet and the next
  scene carries the result, which the dashboard reloads as it would after a command, so every
  moment can be built from nothing and looks the same however it is reached.
- What the narration points at and taps is named by the dashboard's own copy:
  `button:closeRegistration`, `field:capacity`, `tab:schedule` (`AdminMark` in `admin/scene.ts`,
  found by `admin/marks.ts`). The ring follows a relabelled button; a key removed from
  `src/adminLocales.ts` fails the type check; a control that is gone fails `verify.ts` by name.
- The recorded voice can't follow a relabel, so each line lists the labels it says aloud
  (`names` in `admin-guide/narration.ts`). The build warns, and publishing fails, when a label's
  text is no longer in its line: reword the line and record it again.
- Captions read `src/adminLocales.ts` too (`__ADMIN_COPY__`), so they name what the screen names.
- The frame never shows lottery weighting: a guest is added during service, when the dialog has no
  weighting control, and Reports opens on the session summary.

After changing a dashboard screen, rebuild and verify:

```bash
node packages/presentations/build.ts admin-guide
node packages/presentations/publish.ts
node packages/presentations/verify.ts
```

`verify.ts` visits every narration line on the real dashboard and fails when a mark it names isn't
on screen, when the dashboard asks the frame's server something it doesn't answer, when a moment
looks different reached by seeking or by playing, or on any page error. It writes a still per line
to `out/admin-guide/review/` — look through them, since a screen can change in ways no mark notices.
When a change makes the narration wrong (a renamed step, a moved control), edit
`admin-guide/narration.ts` and the beat in `admin-guide/page.ts`, then record and mix again:

```bash
node packages/presentations/voice.ts admin-guide
node packages/presentations/build.ts admin-guide
node packages/presentations/music/mix.ts admin-guide
node packages/presentations/build.ts admin-guide
```

Instruction sources (check these when changing the script):

| Instruction                                                       | Current implementation                                      |
| ----------------------------------------------------------------- | ----------------------------------------------------------- |
| Recurring pattern, next session created automatically, one-off    | `ScheduleView`, `ScheduleStore`, `scheduleIntro`            |
| Opens on its own, Open Early, Postpone, Extend, capacity, Close   | `SessionPhaseControls`, `SessionStepper`, `SessionTimeline` |
| Grace period, automatic draw, Run immediately, postpone, pause    | `SessionTransitionTimer`, `LotteryPendingCard`              |
| Today's overview, Go to the Queue                                 | `SessionOverview`, `SessionPhaseControls`, `QueueView`      |
| Add guest, Give them a spot, end of the line                      | `ManualGuestDialog`, `guestAdmission.ts`                    |
| Broadcast to subscribed guests, sent exactly as written           | `SessionBroadcastForm`, `broadcastHelp`                     |
| Switching screens from the title, grouped                         | `AdminViewSwitcher`, `AdminViewList`                        |
| Guest database search, history add-after, reports without names   | `GuestDatabaseView`, `SessionHistoryRow`, `ReportsView`     |
| Close session replaces Call next; sooner marks waiting as no show | `QueueView`, `confirmCloseSessionOutstanding`               |
