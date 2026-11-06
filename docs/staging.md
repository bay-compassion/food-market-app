# Staging

Staging is a hosted copy of the app for trying behavior out — a new screen, a migration, a whole
market session with fake guests — without touching the production site or its database.

It is the Netlify **branch deploy** of the `staging` branch on the same Netlify project as
production:

- **URL:** <https://staging--baycompassion.netlify.app/>. The address is fixed by the branch and
  project names, which is what lets Auth0 allow it.
- **Database:** its own Netlify DB branch, not production's. Only production deploys can reach the
  main database.
- **Sign-in:** the production Auth0 tenant and the same staff accounts and roles.

Deploy previews stay off: each one is a full build that costs Netlify credits, and staging covers
the same need on demand.

## Deploying to Staging

Point the `staging` branch at whatever you want to try, and Netlify builds it. From GitHub, open
**Actions → Deploy staging → Run workflow** and enter a branch, tag, or commit (`main` resets
staging). From a terminal:

```bash
git push --force origin my-feature-branch:staging
```

Nothing else pushes to `staging`, so overwriting it loses nothing. Migrations under
`netlify/database/migrations/` apply to the staging database on every staging build, which makes
staging the dry run described in [`migrations.md`](migrations.md).

## The Staging Database

**It starts as a copy of production, real guests included.** Netlify takes that copy when the
branch first deploys. Replace it with fake records before testing, and again whenever the branch's
database is recreated:

```bash
NETLIFY_DB_URL="$(pnpm exec netlify db status --branch staging --json --show-credentials | jq -r '.connectionString')" \
  pnpm run seed --reset --force --open-session
```

Check the JSON field name the first time you run it; `netlify db status --branch staging` without
`--json` shows the same thing for a person to read. `--reset` truncates guests, visits, sessions,
and everything that cascades from them; `--force` is required because the database is not local.
See `pnpm run seed --help` for history length and guest count.

The admin dashboard's demo tools (`ENABLE_DEMO_DATA_TOOLS=true`) load a single session at any stage
on top of that — see [`roles.md`](roles.md) for the `manage:demo-data` permission.

## What Staging Does Differently

Environment variables are set in the Netlify UI. A value scoped to the `staging` branch wins over
the **Branch deploys** context, which in turn defaults to the production value, so only the
differences below are set for `staging`:

| Variable                                        | Staging value                        | Why                                                                                                                                                       |
| ----------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TWILIO_ENABLED`                                | `false`                              | No text message ever leaves staging. Netlify won't store an empty value for one branch, so the inherited credentials stay and this switch turns them off. |
| `KIOSK_SECRET`                                  | its own random value                 | A kiosk unlock code from staging cannot unlock a production display.                                                                                      |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`         | their own key pair                   | Push works on staging without sharing production's subscription keys.                                                                                     |
| `SENTRY_ENVIRONMENT`, `VITE_SENTRY_ENVIRONMENT` | `staging`                            | Staging errors are filterable apart from production's in Sentry.                                                                                          |
| `ENABLE_DEMO_DATA_TOOLS`                        | `true` (Branch deploys context)      | Demo sessions can be loaded from the dashboard.                                                                                                           |
| `VITE_LAUNCHDARKLY_CLIENT_ID`                   | its own environment (Branch deploys) | Flags can be flipped on staging without changing production.                                                                                              |

Everything else — Auth0, Sentry DSNs, the notification switch — matches production.

Worth knowing before testing:

- **Staff management is real.** Staging shares the production Auth0 tenant, so inviting or removing
  a worker on staging does it in production too. Use a throwaway address.
- **Timed work may not fire on its own.** Netlify runs scheduled functions only on the production
  deploy; on staging, use **Run now** on the function's page. Confirm a session's automatic
  transitions (Async Workloads) the first time you rely on them on staging.
- **The Twilio incoming-message webhook** points only at production.

## One-Time Setup

Already done for this project, and recorded here in case it has to be redone:

1. **Netlify → Project configuration → Build & deploy → Branches and deploy contexts:** add
   `staging` to the branch deploys.
2. **Environment variables:** set the `staging` branch values in the table above.
3. **Auth0:** `https://staging--baycompassion.netlify.app/` is in the SPA's callback, logout, and
   web-origin URLs in `infrastructure/auth0/tenant/tenant.yaml`. Apply it with
   `pnpm run auth0:plan` and `pnpm run auth0:import` (see [`auth0.md`](auth0.md)).
4. Run **Deploy staging** once, then seed the database as above.

A staging address on `thebaycompassion.org` is possible but not set up: the domain's DNS is not
on Netlify, so it needs a CNAME from `staging.app.thebaycompassion.org` to
`staging--baycompassion.netlify.app`, a request to Netlify support to extend the certificate, and
the new origin added to Auth0.
