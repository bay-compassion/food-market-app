# Error monitoring with Sentry

Sentry is wired up to stay inside the free **Developer** plan. That plan is one seat, 30-day
retention, and a monthly allowance of roughly 5,000 errors, 5M tracing spans, 5 GB of logs, 50
session replays, one uptime monitor, and one cron monitor. A market serves a few hundred guests
an hour for an hour at a time, so the defaults below sample everything rather than guessing at a
rate — the note in each section says what to turn down first if that ever stops being true.

Nothing here runs without a DSN. A fresh clone, the unit tests, Storybook, and the end-to-end
suite all have none, so they never spend quota and never talk to Sentry.

## What is instrumented

| Product                 | Where                                                          | Draws on         |
| ----------------------- | -------------------------------------------------------------- | ---------------- |
| Browser errors          | `src/sentry.ts`, via React's root error hooks                  | errors           |
| Browser tracing         | `src/sentry.ts`, route-aware page and nav load                 | spans            |
| Session replay          | `src/sentry-replay.ts`, on error only                          | replays          |
| Session replay override | `enableReplayWhenFlagged` in `src/sentry.ts`, via LaunchDarkly | replays          |
| User feedback           | `src/sentry-feedback.ts`, opt-in for beta                      | errors, replays  |
| Server errors           | `routeHandler`, and both async workloads                       | errors           |
| Server tracing          | `netlify/lib/sentry.mts`, one span per request                 | spans            |
| Database spans          | `tracedQuery` at each query site                               | spans            |
| Server logs             | Winston transport in `netlify/lib/logging.mts`                 | logs             |
| Source maps             | `@sentry/vite-plugin` in `vite.config.ts`                      | nothing billable |

A guest's page load and the API request it makes are the **same trace**: the browser sends a
`sentry-trace` header, and `tracedRequest` continues it on the server instead of starting a new
one. That is the reason to keep tracing on at all — it is what turns "registration felt slow" into
a specific slow query.

Database work shows up as child spans of whichever request or job is in progress. The Postgres
auto-instrumentation cannot do this: it patches modules through Sentry's ESM loader hooks, and
Netlify bundles each function into a single file with nothing left to patch — the same reason
Sentry's Hono integration is not used here. So each query site calls `tracedQuery` with a name a
reader would recognize (`visit.call_next`, `registration.persist`) rather than the SQL behind it,
which also keeps query text out of Sentry. Two things are deliberately left unspanned: the
per-recipient status writes inside a notification batch, where one span per recipient would spend
the span allowance without saying more than the batch span does, and `persistGuestInformation` and
the other helpers that run inside a caller's transaction, which are already covered by the span
around it.

The background functions are wrapped too. A Netlify async workload retries four times and then
gives up, and the notification it was delivering never goes out — with nobody watching, that is
the failure most worth reporting.

Transactions are named after the route that matched (`GET /api/visit`, `/admin/:view?`), never the
URL as requested. Unmatched paths are reported as `[unmatched]`, the same rule the backend logger
already applies, because an arbitrary URL can carry a token or a guest identifier.

## What is deliberately left out

- **Profiling** is billed separately from the allowances above, so it is not enabled.
- **Cron monitors.** The plan includes one, and nothing here is on a schedule: the two background
  functions are Netlify async workloads triggered by events, not cron. If a scheduled function is
  ever added, that free monitor is available for it.
- **Continuous session replay.** `replaysSessionSampleRate` is `0`, not a low rate. Fifty replays a
  month is not enough to sample ordinary sessions with, and a replay is only worth keeping when
  something went wrong in it.
- **Seer and the AI debugging features**, which are a paid add-on.
- **Anything that identifies a guest.** `sendDefaultPii` is `false` on the server and
  `dataCollection.userInfo` is `false` in the browser, so no IP addresses, cookies, headers, or
  request bodies are attached. Nobody is identified with `Sentry.setUser` unless a beta build opts
  in — see [Identifying beta testers](#identifying-beta-testers). Replays mask all text, all inputs,
  and all media, and record no request or response bodies. The server's Sentry transport sits
  downstream of the logger's `sanitize` format, so the redaction that keeps phone numbers and tokens
  out of stdout keeps them out of Sentry too — with the SMS logger, which records message bodies
  verbatim at debug level, excluded from Sentry entirely.

## User feedback

For beta testing, the app bar menu can offer a **Send feedback** item that opens Sentry's feedback
form. It is off unless a build sets `VITE_SENTRY_FEEDBACK_ENABLED=true`, so a stable release is the
build that says nothing about it. On Netlify, set the variable only for the contexts running the
beta — branch deploys, or production while the beta lasts — and remove it to turn the form off.

It is built to answer the reasons it was once left out entirely:

- **No weight on the guest path.** The form is its own chunk and is not fetched until somebody
  taps the menu item. It uses `feedbackIntegration` rather than `feedbackAsyncIntegration`, which
  would load the form from Sentry's CDN at that moment and fail behind an ad-blocker.
- **No floating button.** `autoInject` is off, so nothing sits over a phone screen's primary
  actions; the menu item is the only way in.
- **Nobody identified without choosing to be.** The name field is optional and labelled so, and
  nothing prefills it except in a build that also identifies beta testers, where it starts out
  holding the name that build already reports. The email field is hidden and screenshots are off —
  screen capture is unavailable on mobile browsers anyway, and on a desktop it would photograph
  whatever guest details were on screen. The message is free text a guest writes, though, so it can
  contain anything; its placeholder asks people to leave personal details out.

Each submission is a feedback event tagged with the guest's `locale`. Sentry attaches the buffered
session replay when there is one, which draws on the same 50-replay allowance as replay on error.
The form's text follows the language selected in the app, from `appBar.feedbackForm` in
`src/locales.ts`, and its writing direction follows it too.

## Identifying beta testers

While the beta runs with internal testers, a build can name the guest on each device in every
event, so somebody who ran into a problem can be found and asked about it. It is off unless a build
sets `VITE_SENTRY_USER_INFO_ENABLED=true`, and it identifies **every** guest using that build, not
only testers — set it on branch deploys or a beta-only site, never on the site a real market uses,
and remove it when the beta ends.

`SentryUserReporter` in `src/sentry-user.ts` follows the guest store, so the user changes when a
guest registers or forgets the device mid-session. Each event carries:

- **`user.id`** — the SHA-256 hex digest of the device token, not the token. The token is the
  credential the server authenticates a guest with, so it never leaves the browser. The digest is
  the value of `guests.device_token_hash`, which is how a Sentry user is matched to a guest record.
  The **Device ID** shown in the identity card's menu is the raw token, so hash it before searching
  Sentry for one (`printf %s "$TOKEN" | shasum -a 256`).
- **`user.username`** — the same first name and last initial the identity card shows. No phone
  number, and nothing for a device that has not registered.

The replay masking is unchanged: the identity card's name and phone stay masked in a recording.
IP addresses stay off as well, since `dataCollection.userInfo` only controls what the SDK infers on
its own and has no effect on a user set explicitly.

## Uptime monitoring

The free plan's single uptime monitor is configured in Sentry rather than in this repository:
**Alerts → Uptime Monitors → Create**, pointing at the deployed site's root URL. Point it at `/`
rather than an API route; the API endpoints either mutate market state or require a token.

## Configuration

Set these on the Netlify site. Only the DSNs are required; the rest have working defaults.

| Variable                                            | Applies to | Default                                                            |
| --------------------------------------------------- | ---------- | ------------------------------------------------------------------ |
| `VITE_SENTRY_DSN`                                   | browser    | unset — Sentry stays off                                           |
| `VITE_SENTRY_ENVIRONMENT`                           | browser    | Vite's mode                                                        |
| `VITE_SENTRY_TRACES_SAMPLE_RATE`                    | browser    | `1`                                                                |
| `VITE_SENTRY_ENABLED`                               | browser    | on — set `false` to disable                                        |
| `VITE_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE`           | browser    | `1` — ignored once `VITE_LAUNCHDARKLY_CLIENT_ID` is set; see below |
| `VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE`            | browser    | `0`                                                                |
| `VITE_SENTRY_FEEDBACK_ENABLED`                      | browser    | off — set `true` for beta                                          |
| `VITE_SENTRY_USER_INFO_ENABLED`                     | browser    | off — beta deploys only                                            |
| `SENTRY_DSN`                                        | functions  | unset — Sentry stays off                                           |
| `SENTRY_ENVIRONMENT`                                | functions  | Netlify's `CONTEXT`                                                |
| `SENTRY_RELEASE`                                    | functions  | Netlify's `COMMIT_REF`                                             |
| `SENTRY_TRACES_SAMPLE_RATE`                         | functions  | `1`                                                                |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | build      | unset — no source map upload                                       |

`VITE_` variables are read at build time, so changing one needs a redeploy, not just a restart.

This project's Sentry organization is `bay-compassion` and its browser project is
`food-market-frontend` — those are the two slugs `SENTRY_ORG` and `SENTRY_PROJECT` want. The DSNs
themselves live only in the Netlify environment. A browser DSN is public by design, since it ships
inside the bundle every guest downloads, but keeping it out of the repository means pointing at a
different project is a settings change rather than a commit. Do not put one in a local `.env`
either: that spends the error allowance on development.

The browser and the functions can share one Sentry project or use two. One project is simpler and
puts a guest's error next to the request that failed behind it; the two DSNs differ either way.

Sample rates are read as numbers between 0 and 1; anything else falls back to the default. If the
error allowance is what runs out, the fix is an inbound filter or a spike protection setting in
Sentry rather than a code change — the SDK is already only reporting real failures.

### Turning replay on without a redeploy

With `VITE_LAUNCHDARKLY_CLIENT_ID` set (see `src/launchdarkly-settings.ts`), the boolean flag
`sentry-replay-enabled` decides whether error replay loads instead of
`VITE_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE` — `enableReplayWhenFlagged` in `src/sentry.ts` subscribes
to it as soon as the LaunchDarkly client exists. The flag must already exist in the LaunchDarkly
project and default to `false`; a flag key LaunchDarkly can't resolve evaluates to that same
`false` forever, which looks identical to "off on purpose" from inside the app. There is no
supported way to remove a Sentry integration once added, so switching the flag back off stops new
sessions from loading replay but does not affect one already running.

With no LaunchDarkly project configured, `VITE_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE` still decides it
at build time, unchanged from before.

### Source maps

Without `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT`, the build skips the upload
entirely and emits no source maps, so a local build is unchanged. With all three set, the build
emits maps, uploads them, and deletes them from `dist` — `dist` never ships a readable copy of the
source. Create the token in Sentry under **Settings → Auth Tokens** with the `project:releases`
scope; the other two are the slugs above.

### Not the setup wizard

Sentry's onboarding offers `npx @sentry/wizard -i reactRouter`. Do not run it here. That installs
`@sentry/react-router`, the SDK for React Router's **framework mode**, and scaffolds the
`entry.client.tsx`, `entry.server.tsx`, and `react-router.config.ts` an SSR app has. This is a Vite
SPA using `createBrowserRouter`, so the wizard would add a second, conflicting SDK and write entry
points into a build that has none. Sentry's own framework guide sends data-mode routers back to the
React guide, which prescribes what `src/sentry.ts` already does:
`reactRouterBrowserTracingIntegration` plus `wrapCreateBrowserRouter`.

## Cost on the guest path

The browser SDK adds about 35 kB gzipped to the entry chunk — the download that stands between
somebody on a phone and the queue. Session replay would roughly double that, which is why it is
loaded as its own chunk after the first paint rather than bundled in. The trade-off is that an
error in the first moments of a page load is reported without a replay attached.

If that 35 kB ever matters more than tracing does, the thing to remove is
`reactRouterBrowserTracingIntegration` in `src/sentry.ts`; error reporting on its own is
considerably smaller.

## Checking that it works

Sentry has no local mode worth running. To confirm a deploy is reporting, throw from a component
or a route handler on a deploy preview and look for the issue in Sentry; the response's
`X-Request-Id` header and the log record's `requestId` field are the same value the server tagged
the invocation with, so a Netlify function log line and a Sentry issue can be matched up by hand.
