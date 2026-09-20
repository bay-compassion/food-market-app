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

| File           | What it is                                                     |
| -------------- | -------------------------------------------------------------- |
| `review.pdf`   | The whole document: title page and contents, then its sections |
| `png/<id>.png` | Each photograph on its own, and where Storybook serves it from |

## Everything is an MDX page

Every word in the document is written in MDX, in Storybook, next to the components it describes. A
page joins the document by tagging itself in its `<Meta>`:

```mdx
<Meta title="Guest/Forms" tags={['review']} />
```

| Tag            | What it is                                                                      |
| -------------- | ------------------------------------------------------------------------------- |
| `review`       | A numbered **section**. Its figures are numbered `section.figure` (`2.3`).      |
| `review-front` | **Front matter**: the title page and contents. Printed first, and not numbered. |

**Order is the sidebar's.** Storybook's story index is sorted by the preview's `storySort`, and the
document prints its sections in that order, so the outline is the `Guest` list in
[`.storybook/preview.tsx`](../.storybook/preview.tsx). Put a new page in that list to place it.

Nothing about a page is listed in a script. A page that exists and is tagged is in the document.

### What a page can hold

- **Prose, headings, diagrams** — written as you would for Storybook.
- **Stories**, as `<Story of={…} />`. Every story on a page is shown inside the app's own top bar and
  footer, in a phone-wide column. The capture turns on the toolbar's **App frame** global; you can
  turn it on yourself in Storybook to see a story the same way.
- **Stills**, as `<Still id="cancel-asked" alt="…" />`: photographs of the running app, for a screen a
  story cannot show. See below.
- **`<Contents />`**, on the title page: the sections in order, each with the page it starts on, and
  when and from what the document was made. In Storybook, which has no print run, it lists the
  sections without page numbers.

Text messages are stories too — [`.storybook/docs/TextMessages.stories.tsx`](../.storybook/docs/TextMessages.stories.tsx)
draws them with the same code the server sends them with
([`src/services/notification-copy.ts`](../src/services/notification-copy.ts)), so a page cannot
disagree with what a guest receives. The current formatter adds the prefix `The Bay Compassion: ` and
the opt-out line `Reply STOP to unsubscribe` in English to every message. The examples shade and
check those exact strings. Only `STOP` must stay in English when the opt-out instruction is translated.

### The printed page

- **Layout.** Words run down a narrow column with wide margins either side to write in. A heading and
  the paragraph above a figure stay on the page with it. A figure too tall to share a page with its
  own introduction is shrunk to fit, rather than split.
- **A figure that needs the whole page.** Wrap it in `<div className="review-fullpage">` and it gets a
  page of its own with slim margins, scaled to fill it. The flowchart on the "Guest States" page is
  one: in the narrow column its arrow labels were too small to read.
- **Numbers.** Section headers name the section; every page after the first is stamped `Page n of N`.
- **The clock is held.** Every countdown reads as it would at ten on a Saturday morning, Bay Area
  time, so a document made next month is the same document.
- **Language.** `--locale es` puts every story and photograph in Spanish. The prose is whatever was
  written, in the language it was written in.

### A hazard: stories share a window

A docs page renders every story it embeds in one window. A story that changes something global —
`window.fetch`, `localStorage` — changes it for all of them, and whichever rendered last wins. The
visit store refreshes itself every fifteen seconds, and a fake `fetch` made every card on the "Guest
States" page turn into the last story's status. Hand a fake to the store instead (`RootStore` takes
per-store options), as `GuestVisitStatus.stories.tsx` does.

## Stills

A docs page embeds components that sit still. A dialog, a menu, or a confirmation sheet exists only
after a guest does something, and would open on top of the page it is embedded in; a screen where the
server fails, or never answers, is not a component at all. Those are photographed from the running
app on a phone — bar and footer included — and embedded with `<Still id="…" />`.

The photographs are taken first, and Storybook serves them at `/stills` while it prints the pages
that use them. The run stops if a page embeds one that nobody photographed. Storybook does not
serve a folder that did not exist when it started, so it is made if missing.

A state a story can show belongs in a story: write it, and embed it. The catalog,
[`scripts/stills/still-catalog.mts`](../scripts/stills/still-catalog.mts), is only for the rest.

There is no backend behind the app. A screen is put in its state the way a guest's phone and the
server would put it there:

- **What the phone has saved** — a language, a name, a visit token.
- **What the server says** — `/api/market` and `/api/visit` are answered by the capture, so the
  market can be open, closed, or serving, a visit can be in any status, and a call can be slow,
  refused, or never answered.
- **What the guest does next** — a still can fill in fields and tap before the photograph.

A still is the state the app is in:

```ts
{
	id: 'text-updates-opted-out',
	guest: 'identified',
	market: SessionStatusEnum.REGISTRATION_OPEN,
	server: { notifications: 'opted-out' },
	overlay: true,
	interact: async (page, copy) => { … },
	anchor: (copy) => copy.formTitle,
},
```

What a still shows, and any caveat about it, is written in the page that embeds it — not here. The
`id` names the PNG and is what a page embeds it by, so it should not change. `overlay: true` shoots
the screen a guest sees rather than the page behind an open dialog.

**The anchor is a guard.** It is text — taken from `locales.ts`, not written as a literal — that
must be on screen before the photograph is taken. A still that never reaches its screen stops the
run and names itself: a route that moved, a fixture the app stopped understanding, or a `getByLabel`
that no longer matches. A figure of the wrong screen in the middle of the document is worse than
none.

To add one, add a step with the `guest`, `market`, and `visit` that put the app there, `server` to
make it answer differently, and `interact` to take the guest one step further; then embed it. A state
that needs a different server answer, or a different thing saved on the phone, is a change in
[`scene-fixtures.mts`](../scripts/stills/scene-fixtures.mts).

The admin dashboard is not in the document. It sits behind Auth0, which a capture with no backend
cannot sign in to. Adding it would take a test-only stand-in for the sign-in wrapper, the way
`e2e-queue/` does it.

## Running it

Storybook is started for the pages and shut down as soon as they are printed. While you are writing
a page, leave your own running and point the capture at it:

```bash
npm run storybook                                                 # in one terminal
npm run capture:stills -- --storybook-url http://localhost:6006
```

A Storybook you started yourself serves stills from `stills/png`. If you write them somewhere else
with `--out`, start it with `REVIEW_STILLS_DIR` set to that folder's `png`.

Naming a still photographs only that one and builds no document, which is what makes iterating on it
quick:

```bash
npm run capture:stills -- --still cancel-asked
npm run capture:stills -- --help          # lists the stills
```

Likewise for the app, with your own `npm run dev`: `--app-url http://localhost:5173`.

## Options

| Option                  | Default    | Meaning                                                        |
| ----------------------- | ---------- | -------------------------------------------------------------- |
| `--out <dir>`           | `stills`   | Output directory                                               |
| `--paper <name>`        | `letter`   | `letter` or `a4`                                               |
| `--orientation <name>`  | `portrait` | `portrait` or `landscape`                                      |
| `--still <id>`          | all        | Photograph only these stills and build no document; repeatable |
| `--no-docs`             | —          | Photograph the stills and build no document                    |
| `--locale <code>`       | `en`       | Language of every screen and story                             |
| `--storybook-url <url>` | —          | Use a Storybook already running                                |
| `--storybook-port <n>`  | `6100`     | Port to start Storybook on                                     |
| `--app-url <url>`       | —          | Use an app already running (`npm run dev`)                     |
| `--port <n>`            | `5180`     | Port to start the app on                                       |
| `--settle <ms>`         | `350`      | Pause after each still renders, before it is shot              |
| `--scale <n>`           | `2`        | Device pixel ratio of the stills                               |

## Reading the run

Each section prints its page and figure counts, so a page that came up short of the figures it was
written with shows in the output. A `~` beside a still means its page was taller than can be read
legibly and shows only the top of it.

Browsers are not part of `npm run checks`, for the same reason `test:e2e` and `test:storybook` are
not: a fresh clone should not need browser binaries. `CHROMIUM_EXECUTABLE_PATH` points the capture
at a browser of your own, for an environment where Playwright cannot fetch its pinned build.
