<!-- diagram-sources: src/App.tsx=fa580c63bb32, src/components/guest-view/GuestView.tsx=df38c9795645, src/components/routes/SignupView.tsx=c194e00e6c59, src/services/guestCardState.ts=dd7c42b8c34a, src/stores/guest.store.ts=404b6be26a0a, src/stores/registration.store.ts=50e057e32fc4, src/services/guestVisitApi.ts=a06988c9ea56, src/stores/visit.store.ts=b9a78935166d, src/stores/root.store.ts=4580a908281c, src/stores/market-session.store.ts=64c01d5698fe, src/services/page-visibility-poller.ts=a6af245df51b, netlify/services/guestRegistration.mts=db37a56e6484, netlify/functions/visit.mts=c3df43d3e2fa, netlify/functions/sms-subscription.mts=0b089d690ac5 -->

# Guest journey

The path a guest takes from opening the app to being served, and the state their visit is in at each
step. Language selection (`GuestLanguageHero`, shown until a returning visitor has picked one) lives
in `GuestView`, backed by the root's shared `TranslationStore`; the registration form, status
screen, and countdown are in
[`src/components/guest-view/GuestView.tsx`](../src/components/guest-view/GuestView.tsx) (route `/`),
with the identity-only sign-up screen in its own
[`src/components/routes/SignupView.tsx`](../src/components/routes/SignupView.tsx) (route `/signup`).
Both read the current market session from the shared
[`src/stores/root.store.ts`](../src/stores/root.store.ts) — every store it composes
(`src/stores/*.store.ts`) lives for the app's lifetime, not any one component's mount. The root's
[`MarketSessionStore`](../src/stores/market-session.store.ts) polls `/api/market` (is registration
open?), while the root's [`GuestStore`](../src/stores/guest.store.ts) owns the device credential
used by `/api/guests` (register for a session), `/api/guest-signup` (identity only, no session), and
`/api/notification-status` (retrieve consent) and `/api/sms-subscription` (grant or revoke SMS
consent). Both routes render the shared `GuestRegistrationForm`, which reads and submits the
in-progress form fields through the root's
[`RegistrationStore`](../src/stores/registration.store.ts) rather than through props, so `/` and
`/signup` don't each wire up their own copy of that state. `/api/visit` (check status, cancel) is
called through [`src/services/guestVisitApi.ts`](../src/services/guestVisitApi.ts), with the root's
[`VisitStore`](../src/stores/visit.store.ts) owning the stored visit token, the active visit, and its
refresh polling — it keeps polling in the background even while the guest is elsewhere in the app
(e.g. `/admin` on the same device), stopping only when the root store itself is disposed.

The diagram is written in [Mermaid](https://mermaid.js.org/), a plain-text diagram format GitHub
renders automatically when viewing this file on github.com. It is maintained by hand — see
[keeping the diagrams honest](data-model.md#keeping-the-diagrams-honest).

Companion diagrams: [`session-lifecycle.md`](session-lifecycle.md) for what the admin is doing
meanwhile, and [`data-model.md`](data-model.md) for where all of this is stored.

```mermaid
flowchart TD
    open([Guest opens the app]) --> seen{Been here before?}
    seen -- no --> pick[Choose a language]
    seen -- yes --> saved[Opens in the saved language]
    pick --> saved

    saved --> hasIdentity{Saved device token<br/>and local profile?}
    hasIdentity -- no device token --> unidentified[Offer to save information:<br/>does not enter the lottery,<br/>and "Save my information" button]
    unidentified -. "Save my information" button .-> signupRoute
    unidentified --> activeSession
    hasIdentity -- token only --> activeSession
    hasIdentity -- yes --> identityShown[Show locally saved<br/>name and phone]
    identityShown --> deviceAuth[Authenticate notification status<br/>with the device token]
    deviceAuth --> notificationRequest{Status retrieval}
    notificationRequest -- pending --> notificationLoading[Show loading indicator]
    notificationRequest -- failed --> notificationError[Show notification status error]
    notificationRequest -- succeeded --> notificationState{SMS consent granted?}
    notificationState -- yes --> notificationEnabled[Show "Notifications Enabled"]
    notificationState -- no --> notifyButton[Show "Notify Me About Updates"]
    notifyButton -. opens .-> offer{Consent dialog:<br/>approve the full SMS terms?}
    offer -- yes --> subscribed[Save consent for the guest;<br/>server finds their active visit<br/>for any catch-up text]
    offer -- no --> notifyButton
    subscribed --> notificationEnabled
    notificationEnabled --> activeSession{Market session active?}
    notifyButton --> activeSession
    notificationError --> activeSession

    activeSession -- no --> inactiveScreen([Inactive market card:<br/>next registration window,<br/>lottery, and notification details])
    activeSession -- yes --> hasVisit{Saved visit token<br/>on this device?}
    hasVisit -- yes --> status[Status screen]
    hasVisit -- no --> canRegister{Registration open?}

    canRegister -- yes --> cachedIdentity{Cached local<br/>name and phone?}
    cachedIdentity -- no --> combinedForm[Sign-up fields — name, phone —<br/>plus lottery-entry fields — age range,<br/>household size, children/seniors —<br/>shown together, one submit]
    cachedIdentity -- yes --> lotteryOnlyForm[Lottery-entry fields only:<br/>age range, household size,<br/>children/seniors]
    canRegister -- no --> phase{Which active phase is<br/>the session in?}
    phase -- registration closed --> closedScreen([Registration-closed screen])
    phase -- service underway --> inServiceScreen([In-service screen])

    signupRoute([Guest visits /signup]) --> alreadyIdentified{Already has a<br/>device token?}
    alreadyIdentified -- yes --> redirectHome[Redirect to /]
    redirectHome --> saved
    alreadyIdentified -- no --> signupOnlyForm[Sign-up form:<br/>name and phone only —<br/>no session or household data]
    signupOnlyForm --> signupSubmit["POST /api/guest-signup<br/>(creates/updates the guest,<br/>no visit)"]
    signupSubmit --> saveSignupIdentity[Save entered name and phone,<br/>and any issued device token]
    saveSignupIdentity --> signupSuccess([Show "Your information is saved"<br/>on /signup])

    combinedForm --> questions[Answer this session's<br/>registration questions]
    lotteryOnlyForm --> questions
    questions --> identity{Saved device token?}
    identity -- yes --> submit[Submit with saved token]
    identity -- no --> firstSubmit[Submit without a device token]
    firstSubmit --> saveIdentity[Save entered name and phone<br/>in this browser only]
    submit --> saveIdentity
    saveIdentity --> registered[Visit created: registered]
    registered --> status

    status --> regClosed[Registration closes<br/>push/sms: registration_closed]
    regClosed --> lottery{Lottery}
    lottery -- selected --> waiting[waiting: guest sees their place in line<br/>and how many are ahead<br/>push/sms: lottery_selected]
    lottery -- not selected --> notPlaced([not_placed<br/>push/sms: lottery_not_selected])

    waiting --> called["Worker calls the guest: called<br/>screen switches to 'it's your turn'<br/>push/sms: called"]
    called --> served([served])
    called --> noShow([no_show])
    noShow -. "worker returns them<br/>to the queue" .-> waiting

    status -. "guest cancels while<br/>registered or waiting" .-> cancelled([cancelled])
```

## Things worth knowing about this path

- **The visit token authorizes one visit.** Registering stores a token on the device
  (`bay-compassion.visit-token` in local storage); every later status check and the cancel action
  authenticate with it. Clearing browser storage loses access to that visit.
- **The guest domain owns a weaker, device-local credential.** `GuestStore` reads
  `bay-compassion.guest-device-token` from local storage and sends it on registration. The server
  stores only its hash. With no recognized token, the server creates a new guest, issues a fresh
  token, and the store saves it after registration succeeds—even when the phone number duplicates
  an older record or a record from another device. A recognized token reuses the guest row and
  refreshes all profile fields. After a successful registration, the store also saves the entered
  name and phone number under `bay-compassion.guest-identity`. The identity indicator reads only
  that browser-local copy; it never retrieves a guest profile from the server. A legacy token with
  no local profile therefore shows no indicator until the guest registers again.
- **`/signup` is its own route (`SignupView.tsx`) for creating a guest identity without a visit.**
  Signing up (name and phone, via `/api/guest-signup`) is decoupled from lottery registration.
  `SignupView` redirects to `/` as soon as it mounts if the browser already has a device token —
  there's nothing left to ask, so the guest lands back on `GuestView`, which shows whatever its
  normal card resolution decides (queue form, visit status, or the session's current phase). A
  browser with no device token instead sees the identity-only form and, on success, an inline
  "your information is saved" message on `/signup` itself. The unidentified
  `GuestIdentityIndicator` provides the in-app link into this flow; a guest can also land on
  `/signup` directly, e.g. from a QR code.
  `GuestRegistrationForm` (the composer) takes a
  `context` prop (`'queue' | 'early'`): `'early'` (only ever passed by `SignupView`) renders only the
  identity fields (`GuestSignupForm`, submitted through `GuestStore.signUp`, no visit created);
  `'queue'` (only ever passed by `GuestView`) renders the lottery-entry fields (`GuestLotteryForm`)
  plus the identity fields too, unless the device already has a cached local identity to skip
  re-asking for. Both routes read and write the in-progress form through the shared
  `RegistrationStore` instead of taking it as props.
- **Signing up and entering the lottery are visually one screen but two components.**
  `GuestRegistrationForm` composes `GuestSignupForm` (name, phone) and `GuestLotteryForm` (age
  range, household size, children/seniors, per-session questions) inside a single `<form>` — one
  submit either way, so the wire contract to `/api/guests` for a lottery entry is unchanged. Only
  the standalone `'early'` sign-up path talks to a different endpoint (`/api/guest-signup`) and
  creates no visit.
- **Inactive market states share one explanation card.** `MarketSessionStore.isActive` is the
  boundary: when it is false, `GuestView` renders `GuestNotOpenState` with the next registration
  window, lottery rules, and notification details, separated by a divider. Saving information is
  offered separately by `GuestIdentityIndicator` when the device has no saved identity. When
  `isActive` is true, the normal card resolver chooses among the registration form, visit status,
  registration-closed message, and in-service message. The separate schedule alert is no longer
  rendered above the card.
- **Household composition — age range, household size, and how many children/seniors (55+) the
  guest is shopping for — is entered fresh at every visit and lives only on `visits`, not on the
  guest's identity.** `GuestLotteryForm` asks for these details each time a guest enters a session's
  lottery; the browser separately keeps its own last-entered copy in `localStorage`
  (`bay-compassion.guest-household`) purely to prefill that form next time — it's never sent to the
  server as part of identity, and never read back from a server-side guest profile. See
  [`data-model.md`](data-model.md) for how this moved off `guests`. Each visit also snapshots the
  normalized phone number so later reconciliation can see earlier values after a guest renews their
  identity.
- **The visit status polls.** The root's `VisitStore` re-checks `/api/visit` on a timer for as long
  as the visit is live — `registered`, `waiting`, or `called` — so the guest sees the lottery result
  and the call even without notifications, and keeps doing so even if they wander to another route
  on the same device. Push is a convenience, never the only channel. Separately, the
  application-level `MarketSessionStore` re-checks `/api/market` every five seconds while the page
  is visible. It pauses while the page is hidden or suspended, then refreshes immediately when the
  guest returns. Both the guest and admin screens observe that same state, so a guest sitting on
  the closed screen sees registration open without reloading, and the form countdown receives a
  new `registrationClosesAt` if an admin closes registration early or extends the window.
- **A waiting guest is told where they stand.** `/api/visit` returns their `queue_position` and how
  many waiting guests are ahead of them, so they can judge whether to stay by the door or sit down.
  Once called, the whole card is replaced by an "it's your turn" panel rather than a changed status
  word — a guest glancing at their phone from across the room has to catch it.
- **An admin can add a guest directly, at any stage of the session.** Those visits are created with
  `source: admin`, and how far the session has progressed decides what the worker may choose —
  see `admissionsFor` in [`src/services/guestAdmission.ts`](../src/services/guestAdmission.ts):
  - Before the draw, the worker picks between entering the guest in the lottery (`registered`, no
    queue position, exactly like a self-registration) and handing them a spot outright (`waiting`,
    at the front of the waiting guests or the end). A reserved spot comes out of `capacity`, so it
    is one fewer place for the draw to give away.
  - A guest entered into the lottery can also be given better odds — the worker picks a named tier
    (standard, higher, highest) which maps to a `lottery_weight` multiplier. This shifts the odds
    without guaranteeing anything: a weighted guest can still miss out. Only a worker can set it,
    and only on a guest going into the draw; a self-registration is always weighted 1.
  - Once service has started the lottery is over, so a walk-in can only go straight into the line.
  - Once the session has ended, the only thing left to record is `served` — someone who was handed
    food outside the app. That visit never joins a queue.
- **Notifications are best-effort.** SMS requires an explicit consent step (separate from just
  having a phone number on file) and Twilio to be configured. Consent belongs to the guest, so it
  applies to future visits until the guest revokes it. `GuestStore` sends the browser-local device
  credential to the authenticated `/api/notification-status` endpoint during initialization,
  which hashes it to identify the guest and restores consent without exposing profile data. The
  same credential authorizes `/api/sms-subscription`; no visit token participates in consent. On a
  new opt-in, the server looks up the guest's visit in the newest non-ended market event and sends
  the appropriate catch-up text if that visit has a live status. The identity indicator shows a
  loading indicator while retrieving notification state, a local error if retrieval fails, and a
  single SMS opt-in button before consent that becomes a compact enabled status afterward. A guest
  without a device credential instead sees a preregistration message and button in the indicator,
  explicitly clarifying that preregistration does not enter the lottery. Push notification plumbing
  remains in place, but push controls are not currently shown to guests.
  Admin broadcasts still reach eligible visits over any subscribed channel whose visit isn't cancelled.
- **Cancelling is only possible before service.** The cancel button appears only while the visit is
  `registered` or `waiting`, and not at all once the session has ended.
- **A closing session resolves anyone left over.** Ending a session marks every visit still
  `waiting` or `called` as `no_show`, so nobody is left holding a status that implies service is
  still coming. See [`session-lifecycle.md`](session-lifecycle.md#the-visit-lifecycle) for the full
  set of visit transitions.
