# A quick primer on how this app is built

This is for anyone maintaining Bay Compassion without a software background. It explains the
handful of concepts you'll run into repeatedly — in this README, in `AGENTS.md`, and in
conversations with an AI coding agent — using this app's own files as examples.

## Frontend, backend, and database — and why they're kept separate

**The frontend** is the part that runs in a guest's or admin's web browser: the screens, buttons,
and forms. In this repo that's everything in `src/`. It's built with Vue (see below).

**The backend** is code that runs on a server, not in anyone's browser. In this repo that's
`netlify/functions/` — small programs that handle things like "someone submitted a check-in form"
or "an admin wants to run the lottery." Each file corresponds to one API endpoint (for example,
`netlify/functions/guests.mts` handles guest registration).

**The database** is where the actual data lives long-term — every guest, every market session,
every visit. It's a separate system entirely (this app uses Netlify DB, backed by Postgres), and
only the backend talks to it directly (`db/` holds the schema and connection code).
[`data-model.md`](data-model.md) has a diagram of every table and how they relate;
[`session-lifecycle.md`](session-lifecycle.md) and [`user-journey.md`](user-journey.md) diagram the
states a market session moves through and the path a guest takes through the app.

They're kept separate for a reason that matters a lot for security: **anything that runs in a
browser can be read and tampered with by whoever is using that browser.** A guest could open their
browser's developer tools and change what their check-in form sends, or try to call an admin
API endpoint directly. The frontend is for convenience and a good user experience; it is never
trusted to enforce rules on its own. The backend re-checks everything — is this person logged in,
is this data valid, is this action allowed — because it's the only part a guest can't tamper with.
The database, in turn, is only ever reached through the backend, never directly from a browser.

## APIs and endpoints

An **API** (application programming interface) is the agreed-upon way two separate programs talk
to each other — here, how the frontend running in a browser asks the backend to do something. Each
**endpoint** is one specific thing the backend can be asked to do. In this repo, each file in
`netlify/functions/` is one endpoint: `netlify/functions/guests.mts`, for example, is the
`/api/guests` endpoint, and its code decides what happens for a `GET`, `POST`, or `PATCH` request
sent to that address. When you read that "the frontend calls an API," it means the browser sent a
request to one of these files and is waiting for a response back.

## Authentication vs. authorization

These sound alike but answer different questions. **Authentication** — "who are you?" — is proving
your identity, which in this app means logging in. **Authorization** — "what are you allowed to
do?" — is a separate decision about what an authenticated person can actually do.

This app doesn't build its own login system — that's a lot of security-sensitive work to get
right, and getting it wrong is a common source of real-world breaches. Instead it uses **Auth0**, a
third-party service that specializes in handling logins: it shows the sign-in screen, verifies the
password (or whatever login method is configured), and then hands the app a signed token proving
who just logged in. The app never sees or stores a password itself — it just trusts Auth0's token.
The README's "Auth0 administration access" section covers how it's configured for this project.

This app's authorization is intentionally simple: every Auth0 user who can sign in has full admin
access — there's no separate "read-only" or partial role layered on top. That means, in this app
specifically, authentication and authorization collapse into a single decision (can this person log
in at all?), which is set by who you invite in Auth0 — worth knowing so you don't assume a more
limited role exists.

## What a frontend framework is, and why this app uses one

A web page's content needs to change constantly as a user interacts with it — a guest fills in a
field, a queue count updates, a list of visitors reorders itself. Doing that by hand (writing raw
JavaScript that finds an element and edits it every time something changes) gets unmanageable fast
and is easy to get subtly wrong.

A **frontend framework** solves this by letting you describe _what the page should look like given
the current data_, and it handles updating the actual page for you whenever that data changes. It
also lets you break the page into reusable pieces called **components** — for instance, this app
has a component for a single form field (`src/FormField.vue`) used in several forms, instead of
copy-pasting the same markup everywhere.

This app uses **Vue** (specifically Vue 3, with its "Composition API" and `<script setup>` style —
if you see either phrase in a file or in `AGENTS.md`, that's just naming the specific flavor of Vue
used consistently throughout this codebase). Every file ending in `.vue` in `src/` is a component.

## Dependencies (npm packages)

This app doesn't write every line of code it needs from scratch — it relies on other people's
published, reusable code, called **dependencies** or **packages**. `package.json` lists which ones
this project uses (Vue itself is one); the actual downloaded code lives in `node_modules/`, which
is never edited by hand and isn't stored in Git. Each dependency is code you didn't write, from
someone you've likely never met, that this app now trusts to behave correctly and safely — which is
exactly why `AGENTS.md` says to prefer the project's existing patterns over adding a new one: every
new dependency is a new piece of outside code this app depends on, and discovering later that one
has a security problem (or is abandoned) is much more work to deal with than not adding it in the
first place.

## Localization (i18n)

**Localization** — often abbreviated **i18n**, short for "internationalization" (18 letters between
the "i" and the "n") — means providing a translated version of every piece of text in the app
instead of hard-coding it in one language. This matters unusually much for Bay Compassion: it
serves guests in English, Spanish, Farsi, Tagalog, Vietnamese, Chinese, and Arabic, several of
which are read right-to-left. All translated text lives in two files — `src/locales.ts`
(guest-facing) and `src/adminLocales.ts` (admin-facing) — each holding one dictionary of strings
per language. `AGENTS.md` requires that any new or changed user-facing text be added to _every_
language's dictionary in the same change, never left in only one "to translate later," because a
missing translation isn't a small cosmetic gap — it's a guest who can't understand the app.

A _missing_ language entry is actually hard to ship by accident — this project is written in
**TypeScript**, a version of JavaScript that checks the "shape" of your data before the code ever
runs, and both locale files are set up so TypeScript checks that every language has every key.
`npm run build` fails loudly if one is missing. What TypeScript can't catch is a key that was
copy-pasted into another language instead of genuinely translated — for that, run
**`npm run check:translations`** (`scripts/check-translations.js`), which flags any value that's
still identical to the English text. Like `npm run checks` above, it's a plain script that works
the same for any agent or a human, not just Claude Code (which also has **`/check-translations`**
as a shortcut for it).

## Git and GitHub

**Git** is a tool that tracks every change to every file over time as a series of snapshots called
commits, each with a message describing what changed and why. It lets you look back at history,
see who changed what and when, undo something, or work on a change in isolation — on a **branch**,
a parallel copy of the codebase — without touching the live version (`main`) until you're ready.

**GitHub** is the website that hosts this project's Git history and adds collaboration tools on top
of it. The one you'll use constantly is the **pull request (PR)**: a proposed set of changes from a
branch, shown as a diff, that sits open for review before it's merged into `main`. Every change —
whether you write it yourself or an AI agent does — should go through a branch and a pull request
rather than being pushed straight to `main`. That gives you a review point, a permanent record of
what changed and why, and a place for the automated checks below to run before anything reaches
the live app.

## GitHub Actions

**GitHub Actions** is automation that runs scripts in response to something happening in the
repository — a push, a pull request, or a manual click — instead of someone having to run those
scripts by hand every time. This repo has two:

- **`.github/workflows/ci.yml`** runs automatically on every push and every pull request. It
  installs the project and runs the same lint/format/test checks described in
  [`docs/testing.md`](testing.md) and the README's "Checks" section, then reports pass or fail
  directly on the PR. Treat a failing check here as a hard stop, not a suggestion — regardless of
  whether the change came from you or an agent.
- **`.github/workflows/deploy-production.yml`** is a manual button (**Actions → Deploy production
  → Run workflow** on GitHub) that triggers a production deploy. It does not run automatically —
  nothing reaches the live app without someone deliberately clicking it. See the README's
  "Deployment" section, and [`docs/migrations.md`](migrations.md) for what this means for the
  database specifically.

## Working with AI coding agents

An AI coding agent is given tools to read files, run commands, and make changes on your behalf —
but unlike a long-time human maintainer, it doesn't automatically know this project's history or
conventions going in. That's what `AGENTS.md` (also readable in this repo as `CLAUDE.md` — they're
the same file) is for: it's read automatically at the start of a session and states the rules an
agent should follow here — formatting, how to handle translations, how to treat database
migrations, and so on. Keeping it accurate is one of the highest-leverage things you can do, since
every future agent session leans on it.

A few habits are worth keeping no matter which agent or tool you're using:

- **Review before merging.** An agent's summary of what it did is a claim, not a guarantee — the
  pull request review step and the automated checks (see "Git and GitHub" and "GitHub Actions"
  above) are what actually confirm it.
- **Never paste `.env` contents or other secrets into a conversation** with an agent, even to ask
  for help debugging — see "Secrets" below.
- **Treat destructive or irreversible requests with extra suspicion** — deleting things,
  force-pushing, running raw SQL, triggering a production deploy — the same way you'd want a new
  hire to check with you before doing any of those on their first day.
- This repo also has a small file, `.claude/settings.json`, that automatically reformats code right
  after an agent edits it (a "hook"). You don't need to do anything with it — it's just why
  agent-written code in this repo always comes out consistently formatted.

## Netlify

**Netlify** is the platform that actually runs this app for the public — it's separate from
GitHub, which just stores and version-controls the code. For this project, Netlify builds the
frontend into files it can serve, runs the backend code in `netlify/functions/` on demand,
provides the database (Netlify DB, mentioned above), and manages deploys. It also builds a preview
deploy — a temporary, fully working copy of the app with its own isolated database — for every
pull request automatically, which is the mechanism `docs/migrations.md` relies on as a safe way to
test a database change before it can touch real data.

Netlify's own dashboard (separate from GitHub) is where environment variables and secrets are
actually configured for the live app, and where things like the Auth0 login integration are set up
(see the README's "Auth0 administration access" section). Whoever maintains this app long-term
needs access to that dashboard, not just to the GitHub repository.

## Secrets — and why the caution is worth the inconvenience

A **secret** is any value that grants access to something and must not become public: an API key,
a password, a private cryptographic key, a database connection string. This app has several —
Auth0 credentials, VAPID keys for push notifications, a Netlify access token — documented (as
placeholders) in `.env.example`.

If a secret leaks — committed to git, pasted into a chat, exposed in a support ticket — anyone who
finds it can use it to impersonate this app: send push notifications as it, access guest data
through it, or rack up costs on the services behind it, until it's noticed and revoked. Unlike a
bug in the code, there's no "just deploy a fix" for a leaked secret — it has to be rotated
(replaced with a new value everywhere it's used) and you generally have to assume anything it
could reach was exposed in the meantime.

Two things worth knowing specifically about this app:

- `.env` (where real secret values live locally) is excluded from git via `.gitignore`. Never
  remove that exclusion, and never paste the contents of `.env` into a chat with an AI agent, a
  support request, or anywhere else — even to ask for help debugging.
- Not everything that looks like a config value is secret. Variables prefixed `VITE_` (like
  `VITE_AUTH0_CLIENT_ID`) get bundled into the frontend code and shipped to every visitor's
  browser — they're public by design and that's fine. Variables without that prefix
  (`VAPID_PRIVATE_KEY`, the Netlify auth token) are backend-only and must stay confidential. When
  in doubt about whether something is safe to share, treat it as a secret until you've confirmed
  otherwise.

## Migrations — and why they get extra scrutiny

The database has a fixed _shape_: which tables exist, what columns they have, what type of data
each column holds. As the app grows, that shape needs to change — a **migration** is a small,
versioned script that makes one such change (add a column, create a table, and so on). They live
in `netlify/database/migrations/`, one folder per change, in the order they need to run.

Migrations get more scrutiny than ordinary code changes for one reason: **most code changes are
easy to undo — redeploy the previous version and the bug is gone — but a migration that deletes a
column also deletes whatever data was stored in it, immediately and for real.** There's no "redeploy
to get it back." This project has a full, repo-specific guide to handling this safely — read
[`docs/migrations.md`](migrations.md) before creating or changing anything under
`netlify/database/migrations/`, and make sure any AI agent doing so has read it too.
