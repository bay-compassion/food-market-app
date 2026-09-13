# Printable app stills

`npm run capture:stills` photographs every state the app can be in and lays the results out as
sheets of paper. It exists for the times a design conversation is better held around a table than
around a screen: print the sheets, spread them out, and draw on them.

```bash
npx playwright install chromium   # once
npm run capture:stills
open stills/stills.pdf
```

The run writes to `stills/` (git-ignored):

| File           | What it is                                                  |
| -------------- | ----------------------------------------------------------- |
| `stills.pdf`   | The sheets, at exactly the page size they were laid out for |
| `stills.html`  | The same sheets on screen, and what the PDF is printed from |
| `png/<id>.png` | Each still on its own, for dropping into a doc or a slide   |

## Where the stills come from

Storybook, not the running app. Storybook already enumerates the states — a submitting form, a
failed request, every `VisitStatus`, each locale's writing direction — and getting the real app into
those states one at a time would mean building a second set of fixtures that could then drift from
the first. Story `play` functions run during capture, so a still shows the state the story puts the
component in rather than the state it mounts in.

That has a consequence worth knowing: a story renders in the shell its `parameters.shell` declares,
not inside the real page, so these are stills of components in their page shell, not of a whole
screen with its app bar and footer. `scripts/capture-twilio-opt-in.mts` is the other pattern — it
drives the real app with mocked API responses — and is the one to copy if a still has to show a
whole screen.

Storybook is started for the run and shut down afterwards. While you are iterating on a sheet,
leave your own running and point the capture at it, which skips the startup each time:

```bash
npm run storybook                                             # in one terminal
npm run capture:stills -- --storybook-url http://localhost:6006
```

## Frames

How much screen a story is given before it is photographed is the group's `frame`: `phone` and
`desktop` keep a whole screen even when the content is shorter, so a guest screen prints as a
phone and a dashboard as a laptop. `component` and `panel` shrink-wrap to the content instead, at
the same two widths, so a button or a queue row does not print as a stamp in the middle of an empty
page. A title inside a group can name its own frame when the group's does not suit it:

```ts
titles: [
	'Guest/Session States/GuestVisitStatus',
	{ prefix: 'Guest/Session States/QueuePositionDots', frame: 'component' },
],
```

A still wider than a phone takes a whole row rather than one column, since a dashboard squeezed
into a phone-width column is too small to read.

## Grouping

Stills are grouped by where they fall in a market day, not by which folder the component lives in:
a guest's path from before registration opens through to being called, then the worker's, then the
design system both are built from. The groups are declared in
[`scripts/stills/still-catalog.mts`](../scripts/stills/still-catalog.mts) and matched against
Storybook titles.

Each group starts a new sheet, so a group can be handed to someone on its own. Stills are numbered
`group.still` (`4.7`) and the number is printed under each one — quote it when you mark a sheet up.

A story whose title no group claims is **left out** and listed at the end of the run. That is the
signal to add its title to a group: a new area should be a deliberate decision about where it
belongs in the day, not an automatic append.

Capture one group, or a few, with `--group`:

```bash
npm run capture:stills -- --group registering --group visit
npm run capture:stills -- --help          # lists the group ids
```

## Paper is the constraint

The page size is fixed and the stills are what gets scaled, so a sheet is always one sheet. A page
is divided into a grid of `--columns` × `--rows` cells and each still is scaled to fit its cell,
keeping its aspect ratio; a landscape still — an admin screen, or a story that lays its own states
out side by side — takes a whole row instead of one column, since a desktop screen squeezed into a
phone-sized column is too small to read.

Pagination is computed in [`print-layout.mts`](../scripts/stills/print-layout.mts) rather than left
to the browser's page breaking, because CSS fragmentation of a wrapped flex container is not
dependable enough to stake a print run on. `PrintLayout.assertUsable()` refuses a grid the paper
cannot carry rather than printing a sheet of slivers.

Cells are the same size whichever stills land in them, so a group of short components prints with
room to spare — useful for writing next to, and `--rows 4` tightens it up when it is not.

Fewer, larger stills leave more room to draw on:

```bash
npm run capture:stills -- --columns 2 --rows 1     # 2 per sheet, plenty of white space
npm run capture:stills -- --paper a4 --margin 0.5
npm run capture:stills -- --orientation landscape --columns 4 --rows 1
```

## Language

By default each story keeps the language it declares, which is what keeps the `Right To Left`
stories right to left instead of turning them into duplicates of their neighbours. `--locale es`
forces every still into one language, which is how to get a sheet to review a translation against.

## Options

| Option                  | Default    | Meaning                                          |
| ----------------------- | ---------- | ------------------------------------------------ |
| `--out <dir>`           | `stills`   | Output directory                                 |
| `--paper <name>`        | `letter`   | `letter` or `a4`                                 |
| `--orientation <name>`  | `portrait` | `portrait` or `landscape`                        |
| `--columns <n>`         | `3`        | Stills across a sheet                            |
| `--rows <n>`            | `2`        | Stills down a sheet                              |
| `--margin <in>`         | `0.4`      | Trim margin, in inches                           |
| `--gap <in>`            | `0.22`     | Gutter between stills, in inches                 |
| `--group <id>`          | all        | Capture only these groups; repeatable            |
| `--locale <code>`       | per story  | Force one language                               |
| `--storybook-url <url>` | —          | Use a Storybook already running                  |
| `--port <n>`            | `6100`     | Port to start Storybook on                       |
| `--settle <ms>`         | `350`      | Pause after render, for `play` functions         |
| `--scale <n>`           | `2`        | Device pixel ratio; 2 is roughly 300dpi in print |
| `--no-pdf`              | —          | Write the HTML sheets but skip the PDF           |

## Reading the run

Each group prints a dot per still, and the run ends with anything worth a second look:

- `~` **cut off** — the story is taller or wider than its frame allows and the still shows only part
  of it. The two usual cases are the legal documents, where a several-page policy is genuinely not a
  still, and `Session States/All`, which lays ten cards out side by side and is covered properly by
  the individual stills either side of it.
- `!` **failed to render** — Storybook showed an error instead of the story. The story is broken,
  not the capture; open it in Storybook.

## Using it for documentation

The PNGs in `stills/png/` are named by story id and are stable across runs, so a doc can reference
one and get the current version on the next capture. `docs/images/` is still hand-curated — these
are shot at a phone frame with no device chrome, which is right for a working print and plain for a
README.

Browsers are not part of `npm run checks`, for the same reason `test:e2e` and `test:storybook` are
not: a fresh clone should not need browser binaries. `CHROMIUM_EXECUTABLE_PATH` points the capture
at a browser of your own, for an environment where Playwright cannot fetch its pinned build.
