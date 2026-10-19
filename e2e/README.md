# Browser tests

The lightweight suite runs with `pnpm run test:e2e` against the Vite development server. It covers
guest language selection, legal pages, SMS consent, and the demo-preview handoff. Tests needing
queue responses supply them through Playwright routes; this suite does not establish an isolated
backend database or authenticated admin session.

```bash
pnpm exec playwright install chromium   # once
pnpm run test:e2e
pnpm run test:e2e --ui
```

## Test sizes

Every test is tagged with how expensive it is to run, which decides where it runs:

| Tag       | What it means                                                          | Where it runs                   |
| --------- | ---------------------------------------------------------------------- | ------------------------------- |
| `@small`  | One page, stubbed API, a few seconds                                   | Every pull request              |
| `@medium` | Several tabs, or waits on polling; tens of seconds                     | Every pull request              |
| `@large`  | The full-stack queue rig in `e2e-queue/`: functions, database, minutes | **Large E2E** workflow, by hand |

Tag a test in its declaration — `test('…', { tag: '@small' }, async ({ page }) => …)` — and filter
with `--grep` / `--grep-invert`, e.g. `pnpm run test:e2e --grep @small`. If a test in this folder
grows slow enough to tag `@large`, it drops out of the pull request run automatically; CI runs
`pnpm run test:e2e --grep-invert @large`.

In CI, the dev server starts with no `.env`, so the workflow sets a placeholder
`VITE_LAUNCHDARKLY_CLIENT_ID`. A spec that depends on a flag must pin it by intercepting
LaunchDarkly's requests (see `guest-tour.spec.ts`); every other flag reads as its default.

For the real queue lifecycle with Netlify Functions, an isolated local database, and separate admin
and guest browsers, use `pnpm run test:e2e:queue`. See [the queue rig guide](../e2e-queue/README.md)
for setup, live step-through debugging, coverage, and failure diagnostics.

Handler unit tests live in `netlify/test/functions/`; they continue to cover validation,
authorization, and API edge cases independently of browser tests.
