# Error monitoring with Sentry

Sentry is wired up to stay inside the free **Developer** plan. That plan is one seat, 30-day
retention, and a monthly allowance of roughly 5,000 errors, 5M tracing spans, 5 GB of logs, 50
session replays, one uptime monitor, and one cron monitor. A market serves a few hundred guests
an hour for an hour at a time, so the defaults below sample everything rather than guessing at a
rate — the note in each section says what to turn down first if that ever stops being true.

Nothing here runs without a DSN. A fresh clone, the unit tests, Storybook, and the end-to-end
suite all have none, so they never spend quota and never talk to Sentry.

## What is instrumented

| Product         | Where                                          | Draws on         |
| --------------- | ---------------------------------------------- | ---------------- |
| Browser errors  | `src/sentry.ts`, via React's root error hooks  | errors           |
| Browser tracing | `src/sentry.ts`, route-aware page and nav load | spans            |
| Session replay  | `src/sentry-replay.ts`, on error only          | replays          |
| Server errors   | `routeHandler`, and both async workloads       | errors           |
| Server tracing  | `netlify/lib/sentry.mts`, one span per request | spans            |
| Server logs     | Winston transport in `netlify/lib/logging.mts` | logs             |
| Source maps     | `@sentry/vite-plugin` in `vite.config.ts`      | nothing billable |

A guest's page load and the API request it makes are the **same trace**: the browser sends a
`sentry-trace` header, and `tracedRequest` continues it on the server instead of starting a new
one. That is the reason to keep tracing on at all — it is what turns "registration felt slow" into
a specific slow query.

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
- **The user feedback widget**, which would add weight to the guest bundle and ask a person
  standing in a food line to file a bug report.
- **Seer and the AI debugging features**, which are a paid add-on.
- **Anything that identifies a guest.** `sendDefaultPii` is `false` on both sides, so no IP
  addresses, cookies, headers, or request bodies are attached. Nobody is identified with
  `Sentry.setUser`. Replays mask all text, all inputs, and all media, and record no request or
  response bodies. The server's Sentry transport sits downstream of the logger's `sanitize`
  format, so the redaction that keeps phone numbers and tokens out of stdout keeps them out of
  Sentry too — with the SMS logger, which records message bodies verbatim at debug level,
  excluded from Sentry entirely.

## Uptime monitoring

The free plan's single uptime monitor is configured in Sentry rather than in this repository:
**Alerts → Uptime Monitors → Create**, pointing at the deployed site's root URL. Point it at `/`
rather than an API route; the API endpoints either mutate market state or require a token.

## Configuration

Set these on the Netlify site. Only the DSNs are required; the rest have working defaults.

| Variable                                            | Applies to | Default                      |
| --------------------------------------------------- | ---------- | ---------------------------- |
| `VITE_SENTRY_DSN`                                   | browser    | unset — Sentry stays off     |
| `VITE_SENTRY_ENVIRONMENT`                           | browser    | Vite's mode                  |
| `VITE_SENTRY_TRACES_SAMPLE_RATE`                    | browser    | `1`                          |
| `VITE_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE`           | browser    | `1` — set `0` to drop replay |
| `SENTRY_DSN`                                        | functions  | unset — Sentry stays off     |
| `SENTRY_ENVIRONMENT`                                | functions  | Netlify's `CONTEXT`          |
| `SENTRY_RELEASE`                                    | functions  | Netlify's `COMMIT_REF`       |
| `SENTRY_TRACES_SAMPLE_RATE`                         | functions  | `1`                          |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | build      | unset — no source map upload |

`VITE_` variables are read at build time, so changing one needs a redeploy, not just a restart.

The browser and the functions can share one Sentry project or use two. One project is simpler and
puts a guest's error next to the request that failed behind it; the DSNs differ either way, since
the browser DSN is public and the server's is not.

Sample rates are read as numbers between 0 and 1; anything else falls back to the default. If the
error allowance is what runs out, the fix is an inbound filter or a spike protection setting in
Sentry rather than a code change — the SDK is already only reporting real failures.

### Source maps

Without `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT`, the build skips the upload
entirely and emits no source maps, so a local build is unchanged. With all three set, the build
emits maps, uploads them, and deletes them from `dist` — `dist` never ships a readable copy of the
source. Create the token in Sentry under **Settings → Auth Tokens** with the `project:releases`
scope.

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
