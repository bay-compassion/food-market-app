# Roles and permissions

Everyone who signs in to the admin area holds an Auth0 role, and that role decides which screens
they get and which requests the server will answer. Without one, a signed-in account sees an
explanation and nothing else.

## The two roles

| Role     | Who it is for                                      | Holds                |
| -------- | -------------------------------------------------- | -------------------- |
| `worker` | Volunteers running the market                      | `run:queue`          |
| `admin`  | Whoever is responsible for the market and its data | all four permissions |

Two roles rather than three because the risk being managed is volunteer turnover: people who run
the table for a season should not be able to reset a session, push a notification to every guest,
or download the whole guest database in one click.

## The permissions

| Permission          | Allows                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| `run:queue`         | Call guests, change a visit's status, add a guest by hand, close the day's session, read session history |
| `manage:sessions`   | Session settings, the question bank, the registration lifecycle, the lottery, broadcasts                 |
| `read:reports`      | The reports screen — counts and rates, never a guest's name                                              |
| `export:guest-data` | The visit export, which carries guest names and phone numbers                                            |
| `manage:demo-data`  | The Dev Mode screen — replaces the current session with fake data staged at a chosen lifecycle point     |

The first four sit behind two roles on purpose. Splitting out a third role later — a board member
or grant writer who should read reports but never see a name, holding `read:reports` alone — is
then a change in the Auth0 dashboard, with no code to write or deploy. `manage:demo-data` is that
kind of split from day one: it belongs on neither `worker` nor `admin`, only on a role of its own
(e.g. `demo`) that starts assigned to nobody — see
[the dev-mode data loader](#the-dev-mode-data-loader) below before granting it to anyone.

## What each endpoint requires

| Endpoint                                 | Requires                                                |
| ---------------------------------------- | ------------------------------------------------------- |
| `GET /api/market`                        | nothing — the guest app depends on it                   |
| `POST /api/guest-information`            | nothing — saves guest identity only                     |
| `POST /api/lottery-registration`         | nothing — public self-service lottery entry             |
| `GET /api/admin/market?view=history`     | `run:queue`                                             |
| `PUT /api/admin/market`                  | `manage:sessions`                                       |
| `POST /api/admin/market`                 | `manage:sessions`, except `close_session` → `run:queue` |
| `GET`, `POST`, `PATCH /api/admin/guests` | `run:queue`                                             |
| `POST /api/admin/queue`                  | `run:queue`                                             |
| `POST /api/admin/broadcast`              | `manage:sessions`                                       |
| `GET /api/admin/reports`                 | `read:reports`                                          |
| `GET /api/admin/reports?view=export`     | `export:guest-data`                                     |
| `GET`, `POST /api/admin/demo-data`       | `manage:demo-data` — and, for `POST`, an env flag too   |

Two of those are deliberate exceptions. **`close_session`** is a worker action — its button lives
on the queue screen a worker uses all day, and ending the day is part of running it. **Session
history** is where a worker records someone served out of band, which is the same job as running
the queue, just after the fact.

`netlify/test/functions/permissions.test.mts` asserts this table endpoint by endpoint. Getting one
of these backwards is exactly the mistake that would hand every volunteer the guest database, so
it is checked rather than trusted.

## Setting this up in Auth0

**Do all of this before merging the code that enforces it.** A user Auth0 has not given a role gets
a token with no permissions, and the moment the server starts checking, they are locked out of the
admin area. The reverse order is safe: turning RBAC on with no enforcement deployed just adds a
claim nothing reads yet, so you can confirm tokens look right and merge afterwards.

1. **Applications → APIs →** the API matching `AUTH0_AUDIENCE` **→ Permissions.** Add the five
   permissions above.
2. **Same API → Settings → RBAC Settings.** Turn on _Enable RBAC_ **and** _Add Permissions in the
   Access Token_. The second one is what puts the `permissions` claim in the token; without it
   nothing else here works.
3. **User Management → Roles.** Create `worker` and `admin` and attach the permissions. Leave
   `manage:demo-data` off both; give it to a separate role only where and when you mean to use the
   dev-mode data loader below.
4. **Assign a role to every existing user**, then sign in and confirm a fresh access token carries
   the `permissions` claim before merging.

## How it is enforced

The Hono admin router in [`netlify/routes/admin/index.mts`](../netlify/routes/admin/index.mts)
is mounted at `/api/admin`. Its `withAuth0` middleware verifies every request against Auth0's keys
before route dispatch and stores the verified permissions in the request context. Missing or
invalid tokens receive **401**. Route-level `withPermission` middleware reuses those permissions
and returns **403** when the token lacks the required permission.

Add protected endpoints to this router using relative paths; the parent gate also covers new
routes without an explicit permission middleware. Each operation must still declare its required
permission. Keep public guest routes outside this subtree. `/api/market` serves only the guest
overview; history and mutations use `/api/admin/market`. Old administrative URLs are not aliases.

The browser also reads the permissions out of the access token, in
[`src/auth.ts`](../src/auth.ts), to decide which navigation items and buttons to show. **That is
not security.** It reads the token without verifying it, and it only exists so a worker is not
offered a button that would come back 403. The server is what enforces this; the hidden button is a
courtesy.

With no Auth0 configured — the usual Vite-only development setup — the browser grants every
permission so the admin screens remain available. Vite does not run the Netlify API; when the
backend is running, admin requests still require a valid Auth0 token and fail closed without
Auth0 configuration.

## What this does not do

Workers still see guest names and phone numbers on the queue and guest-database screens. They have
to; that is the job. What `export:guest-data` protects is bulk download of the entire history in a
single click, which is a different exposure from reading today's line.

## The dev-mode data loader

The Dev Mode screen (`src/components/admin/DevModeView.tsx`, behind `POST /api/admin/demo-data`) lets
someone holding `manage:demo-data` replace whatever session is currently live with fake guests and
visits staged at any point on the session lifecycle — for demos and screenshots. Loading a scenario
archives the current session the same way `close_session` would, so it is destructive to whatever
is live at the time.

Because of that, the permission alone is not enough: `POST /api/admin/demo-data` also checks
`ENABLE_DEMO_DATA_TOOLS`, an environment variable that has to be set to `true` for the specific
Netlify deploy context it should run on. A deploy that never sets it answers every request with a
plain 404, indistinguishable from a route that was never registered, regardless of who is asking.
Set it only on a deploy where every guest in the database is already fake — never on the one the
market actually uses. This mirrors `scripts/seed-fake-data.mts`'s own guard against seeding a
database that isn't `localhost` without `--force`.
