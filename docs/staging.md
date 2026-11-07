# Staging

Staging is a hosted copy of the app for trying behavior out — a new screen, a migration, a whole
market session with fake guests — without touching the production site or its database.

It is a **separate Netlify project**, `baycompassion-staging`, linked to this repository and
building only the `staging` branch:

- **URL:** <https://baycompassion-staging.netlify.app/>
- **Admin:** <https://app.netlify.com/projects/baycompassion-staging>
- **Database:** the project's own Netlify DB, which started empty. It shares nothing with
  production's.
- **Sign-in:** the production Auth0 tenant and the same staff accounts and roles.

Every staging build is that project's production deploy, so scheduled functions and the session
timers (Async Workloads) run on staging exactly as they do in production.

## Why Not a Branch Deploy

Staging used to be a branch deploy of the production project. **A branch deploy is connected to
the production database**: only deploy previews get a database branch of their own. Staff testing
on that staging registered, served, and ended sessions in production. Don't bring staging back as a
branch deploy of the production project, and before trusting any environment's isolation, check
that a row written on it is missing from production.

Deploy previews stay off on both projects to save build credits.

## Deploying to Staging

Point the `staging` branch at whatever you want to try, and the staging project builds it. From
GitHub, open **Actions → Deploy staging → Run workflow** and enter a branch, tag, or commit
(`main` resets staging). From a terminal:

```bash
git push --force origin my-feature-branch:staging
```

Nothing else pushes to `staging`, so overwriting it loses nothing. The production project ignores
the branch. Migrations under `netlify/database/migrations/` apply to the staging database on every
staging build, which makes staging the dry run described in [`migrations.md`](migrations.md).

## Test Data

The staging database starts empty. With `ENABLE_DEMO_DATA_TOOLS=true`, the admin dashboard's demo
tools load a session at any stage with fake guests — see [`roles.md`](roles.md) for the
`manage:demo-data` permission. Guests who register on staging are stored only there.

## What Staging Does Differently

Environment variables are set on the staging project in the Netlify UI. They match production
except:

| Variable                                                  | Staging value           | Why                                                                                                        |
| --------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| `TWILIO_ENABLED`                                          | `false`, no credentials | No text message ever leaves staging.                                                                       |
| `AUTH0_MANAGEMENT_DOMAIN`, `_CLIENT_ID`, `_CLIENT_SECRET` | not set                 | Staff management is off: staging shares the production tenant, so an invite there would be a real account. |
| `KIOSK_SECRET`                                            | its own random value    | A kiosk unlock code from staging cannot unlock a production display.                                       |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`                   | their own key pair      | Push works on staging without sharing production's subscription keys.                                      |
| `SENTRY_ENVIRONMENT`, `VITE_SENTRY_ENVIRONMENT`           | `staging`               | Staging errors are filterable apart from production's in Sentry.                                           |
| `VITE_LAUNCHDARKLY_CLIENT_ID`                             | the non-production one  | Flags can be flipped on staging without changing production.                                               |
| `ENABLE_DEMO_DATA_TOOLS`, `ENABLE_WAREHOUSE_SNAPSHOTS`    | `true`, `false`         | Demo sessions load from the dashboard; trial warehouse runs are opt-in.                                    |

The Twilio incoming-message webhook points only at production.

## One-Time Setup

Already done, and recorded here in case it has to be redone:

1. Create a Netlify project from this repository with `staging` as its production branch, deploy
   previews off, and the environment variables above. Netlify DB provisions with the project.
2. Enable the **Async Workloads** extension for the project, which sets its `AWL_API_KEY_*`.
3. **Auth0:** `https://baycompassion-staging.netlify.app/` is in the SPA's callback, logout, and
   web-origin URLs in `infrastructure/auth0/tenant/tenant.yaml`. Apply it with
   `pnpm run auth0:plan` and `pnpm run auth0:import` (see [`auth0.md`](auth0.md)).
