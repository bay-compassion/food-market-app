# The review document

`npm run capture:stills` builds a PDF for people who will mark it up rather than run the app: a
stakeholder who reads a section, writes a copy change in the margin, and hands the pages back. It
needs no app, Storybook, or code editor on their end.

```bash
npx playwright install chromium   # once
npm run capture:stills
open stills/review.pdf
```

The run writes to `stills/` (git-ignored):

| File           | What it is                                                              |
| -------------- | ----------------------------------------------------------------------- |
| `review.pdf`   | The whole document: contents page, docs pages, then the stills          |
| `review.html`  | The contents page and the stills on screen; what their pages print from |
| `png/<id>.png` | Each still on its own, for dropping into a doc or a slide               |

## Two sources

The document is built from two kinds of page, and the split is the point of the design.

**Docs pages are the spine.** They are MDX pages in Storybook, written by whoever owns the
explanation, with the components embedded as `<Story of={…} />`. Whatever is written there is the
document's prose, and the stories are its figures — nothing about them is listed in a script.
A page joins the document by tagging itself:

```mdx
<Meta title="Guest/Forms" tags={['review']} />
```

Pages are printed in the order of their sidebar paths, numbered `1`, `2`, …, and every story on a
page is numbered `page.figure` (`1.3`) so a reviewer can quote it.

**Stills fill in what a docs page cannot show.** A docs page embeds components that sit still. A
dialog, a menu, a confirmation sheet, or a form that has just been submitted only exists after a
guest does something, and a dialog would open on top of the page it is embedded in. Those are
photographed from the running app instead, and printed after the docs pages. So are the text
messages, which are not screens at all.

## Writing a docs page

Write the MDX as you would for Storybook: headings, prose, `<Story of={…} />`, and a diagram if it
helps. Add the `review` tag to `<Meta>`. That is all the capture needs.

- **The app frame.** Every story on a page is shown inside the app's own bar and footer, in a
  phone-wide column, whatever its file says. The capture turns on the toolbar's **App frame**
  global; you can turn it on yourself in Storybook to see a story the same way.
- **Language.** `--locale es` puts every story in Spanish. The prose is whatever you wrote, in the
  language you wrote it.
- **Layout.** Words run down a narrow column with wide margins either side to write in. A story is
  kept whole on a page where one can hold it, and one taller than a page is shrunk to fit rather than
  split. A heading and the paragraph above a figure stay on the page with what follows.
- **The clock is held.** Every countdown reads as it would at ten on a Saturday morning, Bay Area
  time, so a document made next month is the same document.

### A hazard: stories share a window

A docs page renders every story it embeds in one window. A story that changes something global —
`window.fetch`, `localStorage` — changes it for all of them, and whichever rendered last wins. The
visit store refreshes itself every fifteen seconds, and a fake `fetch` made every card on the
"Guest States" page turn into the last story's status. Hand a fake to the store instead
(`RootStore` takes per-store options), as `GuestVisitStatus.stories.tsx` does.

## The stills

The stills are photographs of the real app on a phone — app bar and footer included — served by a
Vite server the capture starts and shuts down. There is no backend behind it. A screen is put in its
state the way a guest's phone and the server would put it there:

- **What the phone has saved** — a language, a name, a visit token.
- **What the server says** — `/api/market` and `/api/visit` are answered by the capture, so the
  market can be open, closed, or serving, a visit can be in any status, and a call can be slow,
  refused, or never answered.
- **What the guest does next** — a step can fill in fields and tap before the photograph.

The catalog, [`scripts/stills/still-catalog.mts`](../scripts/stills/still-catalog.mts), lists the
sections and their steps. A step is the state the app is in, and what it is showing:

```ts
{
	id: 'text-updates-opted-out',
	caption: 'Texted STOP earlier — how to turn updates back on',
	guest: 'identified',
	market: SessionStatusEnum.REGISTRATION_OPEN,
	server: { notifications: 'opted-out' },
	overlay: true,
	interact: async (page, copy) => { … },
	anchor: (copy) => copy.formTitle,
},
```

The caption prints above the still. A `note` adds a caveat under it — what is an example, or not shown
as it really is. `overlay: true` shoots the screen a guest sees rather than the page behind an open
dialog. The `id` names the PNG and should not change.

**A story that needs a still to be beside it is a docs page's to embed instead.** If a state can be
shown by a story, write the story and embed it; the catalog is only for what cannot be.

### The anchor is a guard

`anchor` is text — taken from `locales.ts`, not written as a literal — that must be on screen before
the photograph is taken. A step that never reaches its screen **stops the run** and names the step:
a route that moved, a fixture the app stopped understanding, or a `getByLabel` that no longer
matches. A printed section with a spinner, or the wrong screen, in the middle of it is worse than no
section.

### Text messages

A text message is not a screen, so it is drawn rather than photographed: `message` on a step names
the kind of message, and the capture builds it with the same code the server sends it with
([`src/services/notification-copy.ts`](../src/services/notification-copy.ts)), so the sheet cannot
disagree with what a guest receives.

The `The Bay Compassion: ` prefix and the `Reply STOP to unsubscribe` line are required on every
message. They are shaded on each sheet, with a key saying so; they are English in every language,
and only the wording between them is editable. A broadcast's wording is written by staff each time,
so the sheet shows an example. `--locale` applies to messages too.

### Section explanations

Each stills section opens with a sheet of its own: its number, title, one-line `summary`, and a
`details` block for the author's explanation. `details` is a plain string on the arc, paragraphs
separated by a blank line. A section with none still gets its opener, with just the title and summary.

### Adding a still

Add a step with the `guest`, `market`, and `visit` that put the app there. `server` makes the server
answer differently, and `interact` takes the guest one step further. A state that needs a different
server answer, or a different thing saved on the phone, is a change in
[`scene-fixtures.mts`](../scripts/stills/scene-fixtures.mts).

The admin dashboard is not in the document. It sits behind Auth0, which a capture with no backend
cannot sign in to. Adding it would take a test-only stand-in for the sign-in wrapper, the way
`e2e-queue/` does it.

## Running it

Storybook is started for the docs pages and shut down as soon as they are printed. While you are
writing a page, leave your own running and point the capture at it:

```bash
npm run storybook                                                 # in one terminal
npm run capture:stills -- --storybook-url http://localhost:6006
```

Naming an arc photographs only that arc and prints no docs pages, which is also what makes iterating
on a still quick:

```bash
npm run capture:stills -- --arc text-updates
npm run capture:stills -- --help          # lists the arc ids
```

Likewise for the stills, with your own `npm run dev`:

```bash
npm run capture:stills -- --arc text-updates --app-url http://localhost:5173
```

## Paper is the constraint

For the stills, the page size is fixed and the stills are what gets scaled, so a sheet is always one
sheet. A page is divided into a grid of `--columns` × `--rows` cells and each still is scaled to fit
its cell, keeping its aspect ratio. The default is one still to a sheet: a phone screen is narrower
than the page, so it leaves margin on both sides to write in, with its caption above it.

A still shorter than a phone screen is not enlarged past the scale a phone screen gets, so a text
message prints its words at the same size as the screens around it. A still taller than a phone screen
is scaled down to fit, so the longest screens print narrower and leave more margin. `png/<id>.png`
has the full resolution.

Pagination is computed in [`print-layout.mts`](../scripts/stills/print-layout.mts) rather than left
to the browser's page breaking, because CSS fragmentation of a wrapped flex container is not
dependable enough to stake a print run on. `PrintLayout.assertUsable()` refuses a grid the paper
cannot carry rather than printing a sheet of slivers.

## Options

| Option                  | Default    | Meaning                                                  |
| ----------------------- | ---------- | -------------------------------------------------------- |
| `--out <dir>`           | `stills`   | Output directory                                         |
| `--paper <name>`        | `letter`   | `letter` or `a4`                                         |
| `--orientation <name>`  | `portrait` | `portrait` or `landscape`                                |
| `--columns <n>`         | `1`        | Stills across a sheet                                    |
| `--rows <n>`            | `1`        | Stills down a sheet                                      |
| `--margin <in>`         | `0.4`      | Trim margin for the stills, in inches                    |
| `--gap <in>`            | `0.22`     | Gutter between stills, in inches                         |
| `--arc <id>`            | all        | Photograph only these arcs and print no docs; repeatable |
| `--no-docs`             | —          | Leave out the docs pages                                 |
| `--locale <code>`       | `en`       | Language of every screen, story, and message             |
| `--storybook-url <url>` | —          | Use a Storybook already running                          |
| `--storybook-port <n>`  | `6100`     | Port to start Storybook on                               |
| `--app-url <url>`       | —          | Use an app already running (`npm run dev`)               |
| `--port <n>`            | `5180`     | Port to start the app on                                 |
| `--settle <ms>`         | `350`      | Pause after each still renders, before it is shot        |
| `--scale <n>`           | `2`        | Device pixel ratio; 2 is roughly 300dpi in print         |
| `--no-pdf`              | —          | Write the HTML but skip the PDF                          |

## Reading the run

Each docs page prints its page count. Each stills section prints a dot per still, and a `~` means
the page was taller than a sheet can carry legibly and shows only the top of it; the run ends by
naming it.

Browsers are not part of `npm run checks`, for the same reason `test:e2e` and `test:storybook` are
not: a fresh clone should not need browser binaries. `CHROMIUM_EXECUTABLE_PATH` points the capture
at a browser of your own, for an environment where Playwright cannot fetch its pinned build.
