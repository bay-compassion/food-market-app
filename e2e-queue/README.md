# Full-stack queue tests

This rig runs the real React app and Netlify Functions using the same Netlify Dev runtime as the
Vite plugin. Netlify's local Postgres emulator (PGlite, with a Postgres wire-protocol server)
gets a fresh temporary directory and the repository's existing migrations on every launch.
It requires Node from `.nvmrc`, `npm ci`, and Chromium (`npx playwright install chromium`).
No Netlify account, Auth0 tenant, Docker, or messaging credentials are needed.

```bash
npm run test:e2e:queue                     # unattended
npm run test:e2e:queue -- --ui             # select, run, and inspect scenarios
npm run test:e2e:queue -- --debug          # step through a live browser session
npm run test:e2e:queue -- -g 'guests register' --debug  # one scenario
npm run test:e2e:queue -- --repeat-each=2   # verify clean repeated runs
```

## Interactive use

Inspector's step button advances the test one action at a time; resume runs to the next pause
or the end. The lifecycle scenario uses named `test.step()` stages for registration, closing,
lottery, calling, serving, and cancellation. Each guest has a separate phone-sized browser context,
so cookies and local storage cannot cross between guests or the admin.

To jump to a particular stage, temporarily insert `await admin.pause()` in the test before its
queue action, then run with `--debug`. While paused, switch between the admin and guest browser
windows/tabs and inspect or interact with the live app. UI mode's historical snapshots are useful
for reviewing actions; Inspector is the tool for stepping through the live scenario.

Manual actions can invalidate the test's next assertion. Stop and rerun the scenario to reset its
data and browser identities. Tests and retries reset the database before beginning, and run with
one worker because the app has a single current session. Do not override the worker count.

**Backend time keeps moving while paused.** Registration is initially open for twelve hours,
but closing it starts the real 30-second grace period. The test waits for the lottery control
through ordinary polling, without changing clocks or bypassing the session rules. The test admin
token also lasts twelve hours; restart the command for longer debugging sessions.

The source is copied at launcher startup to keep `.env` files and linked Netlify state out of the
rig. Test edits can be rerun in UI mode, but restart the command after changing application code.
Ctrl-C closes the owned server and removes the temporary database and credentials.

## Coverage and boundaries

Four guests register through the UI for three places. The admin closes registration, waits for the
grace period, draws the lottery, calls the first winner, and marks that guest served. A waiting
guest cancels. Guest screens must reflect lottery results, calls, completion, and advancing queue
positions without reloads. Database reads verify persisted states and timestamps; fixture writes
only create the initial open session using the existing scenario builder. Assertions follow the
actual lottery winners rather than assuming a random order.

A second test verifies missing and malformed admin tokens receive 401 responses. The rig creates
a fresh signing key and local JWKS endpoint. Only the admin context's same-origin admin API
requests receive a token; the backend still verifies signatures, issuer, audience, and permissions.
A test-only Vite alias replaces the Auth0 account wrapper with a route adapter that mounts the real
admin dashboard in its existing unconfigured-Auth0 mode. Production routes are unchanged.
Real Auth0 sign-in, SMS/push delivery, concurrency, and broader queue edge cases are outside this suite.

The launcher rejects inherited `NETLIFY_DB_URL` values and does not reuse running app servers.
It excludes application credentials from the child environment and disables notifications.
Helpers are outside `netlify/functions/`; there are no test endpoints or production auth bypasses.
The harness serializes handler invocations and fixture commands because PGlite's wire gateway
shares one Postgres session. Fixture commands use a private Unix socket, not application routes.
PGlite exercises real SQL and transactions, but does not replace production-Postgres concurrency
or deployment-platform testing.

## Failures and CI

The separate `queue-e2e` GitHub Actions job runs the same command. Diagnostics are uploaded for
seven days:

- `test-results/queue-server.log`: Netlify startup and function logs.
- `test-results/queue/`: failure screenshots and traces, including each guest context.
- `playwright-report/queue/`: HTML report with named steps and attachments.

```bash
npx playwright show-report playwright-report/queue
```

Traces can contain the throwaway test tokens and synthetic guest details. The private signing key
and temporary database are discarded after the run. Existing lightweight tests remain available
through `npm run test:e2e` and are described in `e2e/README.md`.
