# Browser tests

The lightweight suite runs with `npm run test:e2e` against the Vite development server. It covers
guest language selection, legal pages, SMS consent, and the demo-preview handoff. Tests needing
queue responses supply them through Playwright routes; this suite does not establish an isolated
backend database or authenticated admin session.

```bash
npx playwright install chromium   # once
npm run test:e2e
npm run test:e2e -- --ui
```

For the real queue lifecycle with Netlify Functions, an isolated local database, and separate admin
and guest browsers, use `npm run test:e2e:queue`. See [the queue rig guide](../e2e-queue/README.md)
for setup, live step-through debugging, coverage, and failure diagnostics.

Handler unit tests live in `netlify/test/functions/`; they continue to cover validation,
authorization, and API edge cases independently of browser tests.
