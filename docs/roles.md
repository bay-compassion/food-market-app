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

| Endpoint                           | Requires                                                |
| ---------------------------------- | ------------------------------------------------------- |
| `GET /api/market`                  | nothing — the guest app depends on it                   |
| `GET /api/market?view=history`     | `run:queue`                                             |
| `PUT /api/market`                  | `manage:sessions`                                       |
| `POST /api/market`                 | `manage:sessions`, except `close_session` → `run:queue` |
| `GET`, `POST`, `PATCH /api/guests` | `run:queue` (self-service registration stays open)      |
| `POST /api/queue`                  | `run:queue`                                             |
| `POST /api/broadcast`              | `manage:sessions`                                       |
| `GET /api/reports`                 | `read:reports`                                          |
| `GET /api/reports?view=export`     | `export:guest-data`                                     |
| `GET`, `POST /api/demo-data`       | `manage:demo-data` — and, for `POST`, an env flag too   |

Two of those are deliberate exceptions. **`close_session`** is a worker action — its button lives
on the queue screen a worker uses all day, and ending the day is part of running it. **Session
history** is where a worker records someone served out of band, which is the same job as running
the queue, just after the fact.

`netlify/test/functions/permissions.test.ts` asserts this table endpoint by endpoint. Getting one
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

`requirePermission` in [`netlify/lib/auth.mts`](../netlify/lib/auth.mts) verifies the token against
Auth0's keys and checks the claim. It answers **401** when the token is missing or invalid, meaning
sign in, and **403** when the token is fine but lacks the permission, meaning signing in again will
not help — the browser needs to tell those apart, because retrying the first is right and retrying
the second is a loop.

The browser also reads the permissions out of the access token, in
[`src/auth.ts`](../src/auth.ts), to decide which navigation items and buttons to show. **That is
not security.** It reads the token without verifying it, and it only exists so a worker is not
offered a button that would come back 403. The server is what enforces this; the hidden button is a
courtesy.

With no Auth0 configured at all — the usual local development setup — there is no token to read and
no server-side gate either, so the admin area grants every permission rather than locking a
developer out of the app they are working on.

## What this does not do

Workers still see guest names and phone numbers on the queue and guest-database screens. They have
to; that is the job. What `export:guest-data` protects is bulk download of the entire history in a
single click, which is a different exposure from reading today's line.

## The dev-mode data loader

The Dev Mode screen (`src/components/admin/DevModeView.tsx`, behind `POST /api/demo-data`) lets
someone holding `manage:demo-data` replace whatever session is currently live with fake guests and
visits staged at any point on the session lifecycle — for demos and screenshots. Loading a scenario
archives the current session the same way `close_session` would, so it is destructive to whatever
is live at the time.

Because of that, the permission alone is not enough: `POST /api/demo-data` also checks
`ENABLE_DEMO_DATA_TOOLS`, an environment variable that has to be set to `true` for the specific
Netlify deploy context it should run on. A deploy that never sets it answers every request with a
plain 404, indistinguishable from a route that was never registered, regardless of who is asking.
Set it only on a deploy where every guest in the database is already fake — never on the one the
market actually uses. This mirrors `scripts/seed-fake-data.mts`'s own guard against seeding a
database that isn't `localhost` without `--force`.
