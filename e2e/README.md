# End-to-end tests

These run against `npm run dev` (the Vite dev server only — no Netlify Functions, database, or
Auth0), so they can only cover guest-facing behavior that works without a backend: `GuestView`
treats an unreachable `/api/market` the same as registration being open (see the comment on
`hasLoadedRegistration` in `src/components/guest-view/GuestView.vue`), so the guest screen and the
static `/privacy` and `/terms` pages render fine here. Anything that needs the guest registration
API or an authenticated `/admin` view belongs in `netlify/functions/*.test.ts` or a component test
instead, not here.

Run with:

```bash
npx playwright install chromium   # once
npm run test:e2e
```
