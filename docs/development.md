# Development and operations

Setup, verification, deployment, and optional integrations for The Bay Compassion.
See the [project overview](../README.md) for the product and walkthroughs.

## Quickstart

### Prerequisites

- Node.js 24.15.0 (see `.nvmrc`)
- The [Netlify CLI](https://docs.netlify.com/cli/get-started/), signed in and linked to the Netlify site when you need to use functions or the database

### Run locally

```bash
pnpm install
pnpm start
```

`pnpm start` runs `netlify dev`, which serves the app and Netlify Functions together. Follow the command output to open the local URL.

To work only on the frontend, you can also run:

```bash
pnpm run dev
```

This Vite server does not run the Netlify API function, including `/api/admin/guests`.

### Fake data

A fresh local database is empty, so the queue and the reports have nothing to show. With
`netlify dev` running in another terminal, fill it with a plausible history:

```bash
pnpm run seed                                # 12 past weekly sessions, 120 guests
pnpm run seed --reset --open-session      # start clean, and open a session for today
pnpm run seed --help                      # every option
```

The history includes the awkward cases worth testing against: oversubscribed sessions, guests a
worker added by hand, no-shows, cancellations, and visits served without a recorded time. The
script refuses to touch a database that is not on localhost unless you pass `--force`.

### Review document

Copy and design reviews go better on paper, and the people doing them rarely have the app or a code
editor. `pnpm run capture:screenshots` builds a PDF for them to mark up. Every word in it is an MDX page in
Storybook that tags itself `review`, with its stories shown inside the app's own bar and footer; the
one thing the script makes is screenshots of the running app, for screens a story cannot show, which
a page embeds with `<Screenshot id="…" />`:

```bash
pnpm exec playwright install chromium             # once
pnpm run capture:screenshots                      # → screenshots/review.pdf
pnpm run capture:screenshots --locale es       # the same document, in Spanish
```

See [`docs/screenshots.md`](screenshots.md) for how to write a page, what the screenshots are for, and the
options.

## Checks

Run these commands from the repository root before opening a pull request:

```bash
pnpm run lint
pnpm run format:check
pnpm run check:diagrams
pnpm run test:unit --run
pnpm run build
```

Or run all of them at once with `pnpm run checks`.

See [`docs/testing.md`](testing.md) for why the automated tests matter, especially if you're
relying on an AI coding agent to make changes.

`pnpm run check:diagrams` is the odd one out: it doesn't test the app, it flags when a source file
behind one of the diagrams in `docs/` has changed, so the pictures don't quietly drift out of date.
Review the flagged diagram, then run `pnpm run check:diagrams --update` to record that you did.

## Deployment

The app is configured for Netlify in `netlify.toml`. Connect the repository to a Netlify site; Netlify builds the root app and publishes `dist`, while serving the functions in `netlify/functions/`.

See [`docs/server-security.md`](server-security.md) for the HTTP policies, registration rate
limit, and security-header checks to make on a deploy preview before merging.

Production can also be deployed manually from GitHub without building the app on a GitHub runner:

1. In Netlify, open **Project configuration → Build & deploy → Continuous deployment → Build
   hooks** and create a hook for the production branch.
2. Add the hook URL to the GitHub repository as an Actions secret named
   `NETLIFY_BUILD_HOOK`.
3. In GitHub, open **Actions → Deploy production → Run workflow**.

The workflow only triggers the hook. Netlify performs the build so its production environment
variables are available to Vite and the serverless functions.

Database migrations under `netlify/database/migrations/` apply automatically the moment a build
runs, including production builds — there is no separate manual step. Read
[`docs/migrations.md`](migrations.md) before adding or changing a migration.

### Error monitoring

Sentry reports errors from the browser and the functions, traces a guest's page load through to
the API request behind it, and records a masked replay of sessions that hit an error. It is off
until `VITE_SENTRY_DSN` and `SENTRY_DSN` are set on the Netlify site. Everything is scoped to what
the free Developer plan covers — see [`docs/observability.md`](observability.md) for the
quotas, what is deliberately left out, and the privacy rules that apply to guest data.

### Push notifications

Push notifications use standards-based Web Push with VAPID authentication. Generate the site's
long-lived key pair once:

```bash
pnpm exec web-push generate-vapid-keys
```

Add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` to the Netlify environment. The
subject must be a `mailto:` address or an HTTPS URL. Keep the private key secret and keep the same
key pair across deploys so existing browser subscriptions continue to work.

Set `NOTIFICATIONS_ENABLED=false` in the Netlify environment to hide notification opt-in, stop
queueing and delivering notifications. Notifications remain enabled by default when the variable
is unset.

Install Netlify's Async Workloads extension for the team before deploying notification delivery.
Scheduling a registration window creates one delayed workload event for its close time; editing or
postponing the window creates a replacement, and the old event safely does nothing. A market
transition creates one dispatch event whose checkpointed batches submit the durable delivery rows
to push and SMS providers. No application Scheduled Function polls for notification work.

To test the live Twilio transport without creating a guest or changing a market session, submit a
smoke-test message to one or two explicitly named phones:

```bash
pnpm run sms:smoke --to=+15551234567 --send
```

The command reads `.env`, bypasses the database and workload queue, masks recipients in its output,
and refuses to run without `--send`. It uses live Twilio credentials and may incur messaging charges.

To keep application consent synchronized with replies sent to the Twilio number, enable Advanced
Opt-Out on the Messaging Service and configure its incoming-message integration to send an HTTP
`POST` webhook to `https://<production-domain>/api/twilio/incoming-message`. The endpoint validates
Twilio's request signature, removes every matching guest's SMS subscription for `STOP`, restores it
for `START`, and ignores other incoming messages. Twilio remains responsible for sending the
configured opt-out and opt-in confirmation replies. The webhook also records the Twilio number
that received each active `STOP`. The guest interface detects that record and offers a prefilled
`sms:` link so the guest can send `START` to the same number, which lets Twilio lift its blocks and
lets the webhook restore local delivery. The server-side website re-consent fallback uses Twilio's
Consent Management API and fails closed when that API is unavailable.

## Auth0 administration access

The guest check-in is public. Auth0 protects the `/admin` route, guest records, and every
administrative API operation that changes market or guest data.

Configure Auth0 using [Netlify's Auth0 extension guide](https://docs.netlify.com/extend/install-and-use/setup-guides/auth0/):

1. Deploy and link this repository to a Netlify site.
2. As a Netlify Team Owner, install the **Auth0** extension from the team's Extensions page.
3. In the site's **Access & security** settings, link an Auth0 tenant and add it under **Site
   tenants**.
4. Create or choose both an Auth0 Single-Page Application and an Auth0 API. The API is required
   because the Netlify Functions validate access tokens using its audience.
5. In the Auth0 application's **API Access** tab, edit the Bay Compassion API and grant
   **User-delegated Access**. Without this grant, Auth0 rejects the SPA's audience request.
6. Choose the **Vite** environment-variable preset and assign the configuration to the desired
   deploy contexts. Confirm that Netlify created these values:
   - `VITE_AUTH0_DOMAIN`
   - `VITE_AUTH0_CLIENT_ID`
   - `VITE_AUTH0_AUDIENCE`
   - `VITE_AUTH0_ISSUER`

7. Redeploy the site so Vite can include its `VITE_` variables in the frontend build.

Netlify configures callback, logout, and web-origin URLs when the application is created through
the extension. If you select an existing Auth0 application instead, add the deployed site origin
and the local `netlify dev` origin to **Allowed Callback URLs**, **Allowed Logout URLs**, and
**Allowed Web Origins** in Auth0. Auth0 matches callback URLs exactly, so include the trailing `/`.

For local values not supplied by a linked Netlify site, copy `.env.example` to `.env` and replace
the placeholders. Do not commit `.env`.

Signed-in users need the [API permissions and roles](roles.md) required by each admin
operation. Signing in alone does not grant access.

Tenant configuration is kept as code. Follow the [Auth0 configuration sync guide](auth0.md)
to pull dashboard changes, preview updates, and push reviewed configuration.

## Metabase (optional ad hoc analytics)

The [Reports](reporting.md) screen covers the predefined questions the app anticipates. For
anything else — a one-off chart, a dashboard to watch over time — this repo supports connecting
[Metabase](https://www.metabase.com/), either self-hosted with Docker Compose (`pnpm run
metabase:up`) or on Metabase Cloud. See [`docs/metabase.md`](metabase.md) for setup and,
importantly, how to connect it without handing it the app's own database credentials.

## Project structure

- `src/` — React frontend
- `public/` — static frontend assets
- `scripts/screenshots/` — the review document's capture; see [`docs/screenshots.md`](screenshots.md)
- `netlify/functions/` — API endpoints, including guest check-in
- `netlify/database/migrations/` — Netlify DB migrations; read [`docs/migrations.md`](migrations.md)
  before changing anything here
- `db/` — Drizzle schema and database client; [`docs/data-model.md`](data-model.md) diagrams
  the tables
- `metabase/` — optional Docker Compose setup for self-hosted Metabase; see
  [`docs/metabase.md`](metabase.md)
