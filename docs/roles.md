# Roles and permissions

Everyone who signs in to the admin area holds an Auth0 role, and that role decides which screens
they get and which requests the server will answer. Without one, a signed-in account sees an
explanation and nothing else.

## The roles

| Role            | Who it is for                                      | Holds                                                           |
| --------------- | -------------------------------------------------- | --------------------------------------------------------------- |
| `worker`        | Volunteers running the market                      | `run:queue`, `print:name-tags`                                  |
| `admin`         | Whoever is responsible for the market and its data | the first five permissions, `print:name-tags`, `manage:workers` |
| `owner`         | Organization custodian; managed only in Auth0      | Same as `admin`                                                 |
| `print-station` | The account a print-station desktop signs in as    | `print:name-tags` only                                          |
| `data-steward`  | The named person who answers guest data requests   | `delete:guest-data` only, held alongside `admin`                |

The worker/admin split exists because the risk being managed is volunteer turnover: people who run
the table for a season should not be able to reset a session, push a notification to every guest,
or download the whole guest database in one click.

## Managing Workers

The **Workers** screen is available with `manage:workers`, granted to `admin` and the new
`owner` role. The server also checks the caller's current Auth0 roles on every management
request: only an unblocked `admin` or `owner` may proceed. Owners hold the same market
permissions as admins; assigning or removing `owner` is possible only in Auth0.

Admins can add database users, switch ordinary accounts (including accounts without a role) between Worker and Admin, remove
access, and restore access. Nobody can change their own account. Accounts with `owner` or any
special role (including `developer`, `data-steward`, and `print-station`) are read-only here.
Removal blocks the Auth0 account rather than deleting it. The next admin API request checks
current permissions and blocked status, including for previously issued access tokens. Auth0
sessions and tokens themselves are not deleted. A role change blocks the account first and
unblocks it only after assigning its new role; a provider failure can leave it blocked. Refresh
and retry, or repair the account in Auth0. A failed account creation can leave a blocked account; refresh and restore its access, or repair it in Auth0. No automatic retry repeats a mutation.

New users receive a cryptographically random password that is never returned or logged. Tell
them to choose **Forgot Password** on the sign-in page to set their own password. The app does
not send invitations. Configure Auth0's password reset email provider and template before use.

### Deployment Setup

1. Sync the new API permission and the `admin`/`owner` roles from
   `infrastructure/auth0/tenant/tenant.yaml` using the normal reviewed Auth0 configuration process.
   Assign `owner` to the organization custodian in Auth0; this code never assigns it.
2. Create a **dedicated machine-to-machine application**, authorized for the Auth0 Management API
   with only `read:users`, `create:users`, `update:users`, and `read:roles`.
   Do not reuse the tenant configuration CLI credentials. Do not grant delete-user, role-editing,
   client-editing, or tenant-editing scopes. Auth0's role-assignment scope is broad: keep these
   credentials server-only and rotate them if exposed.
3. Set Netlify server environment variables `AUTH0_MANAGEMENT_DOMAIN` (the tenant's canonical
   hostname, without a scheme), `AUTH0_MANAGEMENT_CLIENT_ID`, `AUTH0_MANAGEMENT_CLIENT_SECRET`,
   and `AUTH0_WORKER_CONNECTION` (the database connection name). Ensure this is the same tenant
   as the access-token issuer and that both the SPA and worker-management M2M application are enabled for that connection. Never put the
   M2M secret in a `VITE_` variable. Keep production credentials out of untrusted deploy previews.
4. Sign in again to pick up `manage:workers`. Verify a worker gets 403, admins can manage
   ordinary staff, self changes fail, and owners remain read-only.

Without management configuration the Workers API fails closed. Setting the management domain
also enables live permission checks for **every** Auth0 admin request. Provider errors fail
closed with 503; there is no fallback to stale token permissions. This adds Management API
traffic (user plus paginated permissions per admin request); size Auth0 rate limits for the
market's polling load before rollout. Overlapping authorization checks for the same worker share
one in-flight read; completed results are discarded immediately. Requests after an access change
cannot join an older check for that account. Within a warm function, Management API requests are
serialized and paced using Auth0's rate-limit reset headers. A rate-limited GET can retry twice;
mutations are never automatically replayed. A long quota window fails closed with an explicit
rate-limit message. This pacing is local to each warm function, not a tenant-wide distributed
limiter; other app instances and Auth0 dashboard activity still share the tenant's quota. The
worker list is paginated ten accounts at a time and reads each account's roles. Permission grants require a fresh access token, while revocations
constrain existing tokens on the next request. Auth0 changes made simultaneously outside the
app are not transactional with app mutations; coordinate owner changes in Auth0 accordingly.

Provider operations follow the Auth0 [user role assignment](https://auth0.com/docs/api/management/v2/users/post-user-roles)
and [user permissions](https://auth0.com/docs/api/management/v2/users/get-permissions) APIs.

Successful changes emit `worker.created` or `worker.access_changed` audit events with the
actor and role/command, and target subject for access changes. Auth0 tenant logs record provider
operations. Preserve these through a log drain if long-term audit retention is needed.

## The permissions

| Permission            | Allows                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------- |
| `run:queue`           | Call guests, change a visit's status, add a guest by hand, close the day's session, read session history |
| `manage:sessions`     | The schedule, the question bank, the registration lifecycle, the lottery, broadcasts                     |
| `read:reports`        | The reports screen — counts and rates, never a guest's name                                              |
| `export:guest-data`   | The visit export, which carries guest names and phone numbers                                            |
| `manage:guest-access` | A QR code that puts any guest on a phone — including one already on another phone, which then loses it   |
| `delete:guest-data`   | Permanently deleting a guest and everything about them, after typing their phone number to confirm       |
| `manage:demo-data`    | The Dev Mode screen — replaces the current session with fake data staged at a chosen lifecycle point     |
| `print:name-tags`     | The `/printing-station` page — prints the name tags volunteers send: first name and last initial only    |

The first five sit behind two roles on purpose. Splitting out a third role later — a board member
or grant writer who should read reports but never see a name, holding `read:reports` alone — is
then a change in the Auth0 dashboard, with no code to write or deploy. `manage:demo-data` is that
kind of split from day one: it belongs on neither `worker` nor `admin`, only on a role of its own
(e.g. `demo`) that starts assigned to nobody — see
[the dev-mode data loader](#the-dev-mode-data-loader) below before granting it to anyone.

`manage:workers` allows staff management and is held only by `admin` and `owner`.

## What each endpoint requires

| Endpoint                                                 | Requires                                                |
| -------------------------------------------------------- | ------------------------------------------------------- |
| `/api/admin/workers`, `/api/admin/workers/:id`           | `manage:workers` plus a current admin or owner role     |
| `GET /api/market`                                        | nothing — the guest app depends on it                   |
| `POST /api/guest-information`                            | nothing — saves guest identity only                     |
| `POST /api/lottery-registration`                         | nothing — public self-service lottery entry             |
| `POST /api/kiosk/unlock`                                 | nothing but a current unlock code                       |
| `GET /api/kiosk/board`                                   | a kiosk token, not Auth0 — see the room display below   |
| `GET /api/admin/market?view=history`                     | `run:queue`                                             |
| `POST /api/admin/market`                                 | `manage:sessions`, except `close_session` → `run:queue` |
| `/api/admin/schedule` (every method)                     | `manage:sessions`                                       |
| `POST`, `PATCH /api/admin/guests`                        | `run:queue`                                             |
| `GET /api/admin/guests` (current session)                | `run:queue`                                             |
| `GET /api/admin/guests` (`scope=all` or another session) | `export:guest-data`                                     |
| `POST /api/admin/queue`                                  | `run:queue`                                             |
| `POST /api/admin/broadcast`                              | `manage:sessions`                                       |
| `POST /api/admin/guest-claims`                           | `run:queue`; plus `manage:guest-access` to override     |
| `GET /api/admin/reports`                                 | `read:reports`                                          |
| `GET /api/admin/reports?view=export`                     | `export:guest-data`                                     |
| `GET /api/admin/guests/:id/deletion`                     | `delete:guest-data`                                     |
| `DELETE /api/admin/guests/:id`                           | `delete:guest-data`                                     |
| `GET`, `POST /api/admin/demo-data`                       | `manage:demo-data` — and, for `POST`, an env flag too   |
| `POST /api/admin/kiosk/unlock-codes`                     | `run:queue`                                             |
| `GET /api/admin/visits/:id/events`                       | `run:queue`                                             |
| `POST /api/admin/print-jobs`                             | `run:queue`                                             |
| `GET /api/admin/print-station`                           | `run:queue`                                             |
| `GET /api/admin/print-jobs`                              | `print:name-tags`                                       |
| `DELETE /api/admin/print-jobs/:id`                       | `print:name-tags`                                       |

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

1. **Applications → APIs →** the API matching `AUTH0_AUDIENCE` **→ Permissions.** Add the nine
   permissions above.
2. **Same API → Settings → RBAC Settings.** Turn on _Enable RBAC_ **and** _Add Permissions in the
   Access Token_. The second one is what puts the `permissions` claim in the token; without it
   nothing else here works.
3. **User Management → Roles.** Create `worker` and `admin` and attach the permissions. Leave
   `manage:demo-data` off both; give it to a separate role only where and when you mean to use the
   dev-mode data loader below.
4. **Assign a role to every existing user**, then sign in and confirm a fresh access token carries
   the `permissions` claim before merging.

### Worker names in visit history

Each visit's history (`visit_events`) names the worker who made each change — "Called by Matt". An
access token carries the worker's Auth0 subject but not their name, so a post-login **Action** adds
it under a namespaced claim the server reads (`workerNameClaim` in `netlify/lib/auth.mts`):

```js
// Actions → Library → Create Action → "Login / Post Login", then add it to the Login flow.
exports.onExecutePostLogin = async (event, api) => {
	// Prefer a given name. Username/password users often have their email address in `name`,
	// and an email is not what a volunteer should see on another volunteer's screen.
	const name = [event.user.given_name, event.user.name].find(
		(value) => typeof value === 'string' && value.trim() && !value.includes('@'),
	);

	if (name) {
		api.accessToken.setCustomClaim('https://thebaycompassion.org/claims/name', name.trim());
	}
};
```

Check a real volunteer's profile before deploying the Action to confirm which attribute holds the
name you want shown. The code tolerates the claim being missing, so the order of deploying it and
the Action doesn't matter: until a worker's token carries the claim, their entries are recorded
with their subject and no name. A worker who was already signed in picks the name up when their
access token next refreshes.

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

## Putting a guest on a phone

`POST /api/admin/guest-claims` issues a single-use code, valid for fifteen minutes, that a guest scans
to take their record onto their own phone. What the caller may ask for depends on what they hold:

- **`run:queue` alone (a worker)** — only for a guest no phone holds, and only one added in the last
  fifteen minutes. That is the walk-in standing at the table; it is not a record from last week
  looked up by id.
- **`manage:guest-access` as well (a manager)** — any guest at any time, from the guest's Actions
  menu. That includes a guest already on another phone: the override, for someone whose phone was
  replaced or wiped.

An override is an account handover, so treat it like one:

- **Scanning it takes the guest's record and current place in line away from their old phone.** The
  old device credential stops working, the visit is re-keyed, and any push subscription on that
  visit is dropped. Nothing changes before the code is scanned, so issuing one and walking away is
  harmless — but whoever scans first wins.
- **Check who is at the desk.** The Actions menu asks the manager to confirm the phone number on
  file before showing the code. Someone posing as a guest could otherwise take that guest's spot in
  line.
- **Texts do not follow the phone.** SMS goes to the number on file, so an override neither moves
  a guest's texts nor fixes a wrong number.
- **Every code issued and redeemed is logged** — `guest_claim.issued` with the issuer's Auth0
  subject, and `guest_claim.redeemed` — see [`backend-logging.md`](backend-logging.md). Netlify
  keeps function logs only briefly; set up a log drain if these need to outlast that.

`manage:guest-access` extends `run:queue` rather than standing alone: a role holding it without
`run:queue` is refused at the first gate, because the override is only reachable from screens that
list guests. It is on `admin` in `infrastructure/auth0/tenant/tenant.yaml`. Push that to
Auth0 before merging the code that checks it; until then an admin's override is refused with a 403
and nothing else changes.

## Deleting a guest permanently

`delete:guest-data` answers a guest who asks us to delete their information, as the privacy policy
promises. It lives on its own `data-steward` role rather than on `admin`, so the person who can
erase a guest is a named choice, not everyone responsible for the market. Give that role to the
one or two people who handle data requests, alongside `admin`: it extends `export:guest-data`,
because the guest database it is offered from only loads with that.

In the guest database, a guest's Actions menu offers **Delete Guest Permanently**. The dialog
shows who they are and what goes with them, and its button stays disabled until the admin types
the guest's phone number. The server checks that number again, and refuses a guest who has a
visit in a session that has not ended. Every deletion is logged as `guest.deleted` with the
guest's id and the admin's Auth0 subject — the only trace left, since the visit history goes with
it. See [`guest-deletion.md`](guest-deletion.md) for the whole procedure, including what the
deletion cannot reach.

Push `infrastructure/auth0/tenant/tenant.yaml` to Auth0, then assign `data-steward` to the right
person. Until it is assigned, nobody is offered the menu item and both endpoints answer 403.

## The room display

`/kiosk` is a full-screen "now calling" board for a tablet or monitor in the room: the number
being called, the numbers called earlier that nobody has come up for yet, and how many are still in
line. It shows queue numbers only, never a name.

It does not sign in to Auth0. A display stands in a public room for weeks at a time, and an account
signed in there — above all a worker's own, used "just for a minute" to get it going — would be
left open to anyone who walks up. Instead a worker **unlocks** it:

1. **On a phone signed in as a worker, choose "Unlock a room display"** — in the menu on `/queue`
   or on the dashboard's Queue tab, or on that tab's own page before service starts. It shows the
   display's web address (this site's `/kiosk`) and six digits, so nobody setting a display up has
   to know the address already.
2. **On the display, go to that address.** A locked display says so and asks for a code. That
   screen is a gate for whoever sets the display up, so it is in English alone; the board behind
   it rotates through every language as usual.
3. **Type the six digits into the display.** The display trades the code for a kiosk token it keeps
   in its own browser storage, and starts showing the board. One code works on any number of
   displays for five to ten minutes.
4. **Make the display open there by itself, and stay there** — Add to Home Screen on a tablet, or
   start Chrome at the address with its `--kiosk` flag on a computer; then Guided Access on an iPad
   or Screen Pinning on Android — so there is no address bar to type `/admin` into, and switching
   the display on brings back the board without anyone typing the address again.

Every line on the display is in English, with a second language underneath that rotates through
the others, 8 seconds each; a row of language names along the bottom shows which one is up. Add
`?lang=es` (any supported language code) to pin the second language, or `?lang=en` for English
alone.

The token grants `GET /api/kiosk/board` and nothing else; it is not an Auth0 token, and every admin
endpoint refuses it. It lasts 180 days, after which the display asks for a code again. Both codes
and tokens are derived from the `KIOSK_SECRET` environment variable — at least 32 random
characters, e.g. `openssl rand -base64 32` — and nothing about either is stored on the server.
**To relock every display at once, for a lost tablet say, change `KIOSK_SECRET`** and redeploy.
Without the variable, no code can be issued and no display unlocked.

Neither `/api/kiosk/unlock` nor `/api/kiosk/board` reads the database until the token checks out,
so a stray browser polling without one, or someone guessing codes, never keeps the database awake.
An unlocked display reads the board every 5 seconds from the moment registration opens until the
session ends, and every 10 minutes otherwise, which lets the database suspend overnight and
between market days.

The display keeps its screen awake where the browser supports the Screen Wake Lock API, and keeps
the last board up with a "Reconnecting…" note if a poll fails.

The display used to sign in as an Auth0 user holding a `kiosk` role and a `view:kiosk` permission.
Both are gone from `infrastructure/auth0/tenant/tenant.yaml`; pushing it removes them from the
tenant, and any `kiosk-…@` users left over can be deleted.

## The print station

`/printing-station` runs on a desktop at the market with the label printer attached, and prints the
name tags volunteers send from `/queue` on their phones — with no print dialog, when its browser is
started for it (see [`name-tag-printing.md`](name-tag-printing.md)). It signs in as an account of
its own, so the unattended machine can do its one job and nothing else. (The room display used to
work the same way, and now unlocks with a code instead; the print station may follow.)

1. **Create one Auth0 user for the station**, e.g. `print-station@…`, with a long generated
   password, and give it the `print-station` role and nothing else.
2. **On the desktop, open `/printing-station` and sign in as that user.**

`print:name-tags` grants only collecting waiting tags and removing printed ones. A tag carries the
guest's first name, last initial, place in line, and language — what the label shows — and nothing
else. Sending a tag and asking whether a station is online are `run:queue`, since that is what a
volunteer on `/queue` holds. `worker` and `admin` hold `print:name-tags` as well, so a staff member
can run the station signed in as themselves.

Push `infrastructure/auth0/tenant/tenant.yaml` to Auth0 before relying on the station. Until then
it is refused with a 403 and says the account can't run it, and every phone keeps using its own
print dialog, since no station ever reports in.

## What this does not do

Workers still see guest names and phone numbers on the current session's queue and guest screens.
They have to; that is the job. What `export:guest-data` protects is every path to the history that
is _not_ today's line: the bulk CSV download, the whole-database view (`scope=all`), and reading a
finished session's roster by its id. Reading today's line is `run:queue`; reaching across sessions
is the same exposure as the export, however it is spelled, so it takes the same permission.

## The dev-mode data loader

The Dev Mode screen (`src/components/admin/DevModeView.tsx`, behind `POST /api/admin/demo-data`) lets
someone holding `manage:demo-data` replace whatever session is currently live with fake guests and
visits staged at any point on the session lifecycle — for demos and screenshots. Loading a scenario
archives the current session the same way `reset_session` would (a pending session nobody has
joined is deleted instead), so it is destructive to whatever is live at the time.

Because of that, the permission alone is not enough: `POST /api/admin/demo-data` also checks
`ENABLE_DEMO_DATA_TOOLS`, an environment variable that has to be set to `true` for the specific
Netlify deploy context it should run on. A deploy that never sets it answers every request with a
plain 404, indistinguishable from a route that was never registered, regardless of who is asking.
Set it only on a deploy where every guest in the database is already fake — never on the one the
market actually uses. This mirrors `scripts/seed-fake-data.mts`'s own guard against seeding a
database that isn't `localhost` without `--force`.
