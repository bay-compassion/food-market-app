# Privacy and Security in the Design

Guest names, contact information, household details, and questionnaire answers are personal
information. The app uses these records to run the market; aggregate reporting does not make the
underlying records anonymous. The examples below trace the safeguards to their implementation and existing tests. Deployment
settings also affect their operation. The [purpose post](project-purpose.md) explains how privacy
relates to the market’s mission.

## Access Depends on the Operation

All routes mounted in the admin API pass through server-side Auth0 authentication. Tokens are
verified against the configured issuer and audience, using RS256 signatures. Individual routes
then require the permission for the requested operation; hiding a button is not the access control.

Running the current queue requires `run:queue`. Reading the whole guest database or a historical
session requires `export:guest-data`. Aggregate reports require `read:reports`, while an export
that identifies guests requires `export:guest-data`. This separates day-to-day service from access
to personal records across visits.

Sources: [admin router](../netlify/routes/admin/index.mts),
[token verification](../netlify/lib/auth.mts), [guest access](../netlify/routes/admin/guests.mts),
[report and export access](../netlify/routes/admin/reports.mts).
Verification: [permission tests](../netlify/test/functions/permissions.test.mts) and
[authentication tests](../netlify/lib/auth.test.mts).

## Guest Credentials Are Separate from Guest Details

Device and visit credentials are generated from 32 cryptographically random bytes. The server
stores SHA-256 hashes of those credentials and checks a presented bearer credential against its
hash. The guest's visit endpoint returns that visit and queue information, not another guest's
name or phone number. The shared calling board selects queue numbers rather than identities.

Hashing protects the stored access credentials; it is not encryption of names, phone numbers, or
questionnaire answers. Raw credentials and remembered identity details are stored in the guest's
browser, so protecting the browser and device also matters.

Sources: [credential generation](../netlify/services/guestCredentials.mts),
[device authentication](../netlify/lib/deviceAuth.mts),
[guest visit API](../netlify/routes/guests/visit.mts),
[calling board](../netlify/services/queue-board.mts), [guest store](../src/stores/guest.store.ts).
Verification: [credential tests](../netlify/services/guestCredentials.test.mts) and
[device authentication tests](../netlify/lib/deviceAuth.test.mts).

## Personal Responses Are Not Shared Cache Content

The API boundary sets `Cache-Control: no-store` on handled responses, including credentials,
reports, and authentication errors. It also applies browser security headers and limits request
bodies. Request logging records registered route names rather than arbitrary URLs, which could
contain identifying information.

The broader static-site content security policy remains report-only; its presence is not evidence
of full enforcement. Netlify supplies transport protections such as HSTS, and deployed headers
need verification in their actual environment.

Sources: [API boundary](../netlify/lib/http.mts), [Netlify configuration](../netlify.toml),
[deployment security guide](server-security.md).
Verification: [HTTP boundary tests](../netlify/lib/http.test.mts).

## Diagnostics Limit Exposure of Guest Information

The operational logger removes fields including authorization, cookies, tokens, phone numbers,
email addresses, and request bodies. Error serialization retains error type and stack frames,
without the error message that could contain database or provider details. The Sentry log
transport receives those sanitized records.

Browser replay masks inputs and explicitly marked identity fields, blocks media, and excludes
request/response body capture. In the current code, `maskAllText` is **false**: interface text can
remain visible, while the guest identity card marks the name and phone for masking. Browser
inferred user information is disabled, and the server disables default PII collection.

These settings do not mean telemetry is anonymous. Events carry a pseudonymous install ID. An
opt-in beta setting can attach a hashed device identifier and displayed guest name. The SMS logger
masks recipients to their last four digits but can log message contents at debug level; those logs
are deliberately not forwarded through its own Sentry transport. Configuration and retention
choices therefore remain part of maintaining privacy.

Sources: [operational and SMS logging](../netlify/lib/logging.mts),
[replay settings](../src/sentry-replay.ts),
[identity masking](../src/components/guest-view/identity/GuestIdentityCard.tsx),
[browser monitoring](../src/sentry.ts), [server monitoring](../netlify/lib/sentry.mts),
[beta identity reporting](../src/sentry-user.ts), [monitoring settings](../src/sentry-settings.ts).
Verification: [logging tests](../netlify/lib/logging.test.mts),
[monitoring settings tests](../src/sentry-settings.test.ts),
[identity reporter tests](../src/sentry-user.test.ts).

## Consent and Remembered Information Have Explicit Controls

SMS enrollment requires an authenticated device and a literal `consent: true`. Guests can delete
their SMS subscription. The Twilio incoming-message endpoint validates the provider's signature
before processing opt-out and opt-in events.

The guest's forget action clears the saved identity, device credential, and household prefill
from that browser. It does not delete the server's guest or visit records, revoke previously issued
credentials, or remove the separate visit credential and install ID. Describe it as forgetting
saved personal details on a device, not as account or database deletion.

An optional iPhone Home Screen installation temporarily copies those browser-held credentials and
remembered details through a one-hour, same-site cookie scoped to the static `/pwa-start` path. It is
never sent to API paths or placed in a URL. A new standalone app consumes it before the stores load,
and refuses to overwrite an existing guest or visit. Changing or forgetting the guest clears a pending
copy in that browser. See [Home Screen installation](home-screen-installation.md) for the data
allowlist, expiration, platform restrictions, and device verification requirements.

Sources: [SMS enrollment](../netlify/routes/notifications/sms-subscription.mts),
[provider webhook](../netlify/routes/notifications/twilio-incoming-message.mts),
[forget action](../src/stores/guest.store.ts).
Verification: [SMS subscription tests](../netlify/test/functions/sms-subscription.test.mts) and
[guest store tests](../src/stores/guest.store.test.ts).
