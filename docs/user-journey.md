<!-- diagram-sources: src/App.tsx=36fd8ef76785, src/components/guest-view/GuestView.tsx=b87928f8854a, src/components/routes/SignupView.tsx=0100784f6b84, src/stores/guest.store.ts=9f91cfa8f3e3, src/stores/registration.store.ts=8ee80322c315, src/services/guestVisitApi.ts=d46cb5e2b411, src/stores/visit.store.ts=3a88088d1d10, src/stores/root.store.ts=e72b1453c15b, src/stores/market-session.store.ts=7f95f07cee04, src/services/page-visibility-poller.ts=a6af245df51b, netlify/services/guest-information.mts=9f1e48fd573b, netlify/services/guestRegistration.mts=b7aa91ee7435, netlify/routes/guests/guest-information.mts=965fe205abe3, netlify/routes/guests/lottery-registration.mts=d6457e18b8cc, netlify/routes/guests/visit.mts=b93f87b0b696, netlify/routes/notifications/sms-subscription.mts=217306754150, src/components/routes/ClaimView.tsx=b1b51dad524d, src/components/guest-view/identity/GuestClaimCard.tsx=0afb6f55c178, src/stores/guest-claim.store.ts=16719fddc94b, netlify/services/guest-claim.mts=3402af73fae9, netlify/routes/guests/guest-claim.mts=4f0c2115353d -->

# Guest journey

The path a guest takes from opening the app to being served, and the state their visit is in at each
step. Language selection (`GuestLanguageHero`, shown until a returning visitor has picked one) lives
in `GuestView`, backed by the root's shared `TranslationStore`; the registration form, status
screen, and countdown are in
[`src/components/guest-view/GuestView.tsx`](../src/components/guest-view/GuestView.tsx) (route `/`),
with the identity-only sign-up screen in its own
[`src/components/routes/SignupView.tsx`](../src/components/routes/SignupView.tsx) (route `/signup`),
and the screen a worker's QR code opens in
[`src/components/routes/ClaimView.tsx`](../src/components/routes/ClaimView.tsx) (route `/claim`).
Both read the current market session from the shared
[`src/stores/root.store.ts`](../src/stores/root.store.ts) — every store it composes
(`src/stores/*.store.ts`) lives for the app's lifetime, not any one component's mount. The root's
[`MarketSessionStore`](../src/stores/market-session.store.ts) polls `/api/market` (is registration
open?), while the root's [`GuestStore`](../src/stores/guest.store.ts) owns the device credential
used by `/api/lottery-registration` (register for a session), `/api/guest-information` (identity
only, no session), and
`/api/notification-status` (retrieve consent) and `/api/sms-subscription` (grant or revoke SMS
consent). The routes render dedicated zero-prop forms—`GuestCombinedForm` for market registration
and `GuestSignupForm` for identity-only signup—which share the same visual form shell and read the
in-progress fields through the root's [`RegistrationStore`](../src/stores/registration.store.ts).
`/api/visit` (check status, cancel) is
called through [`src/services/guestVisitApi.ts`](../src/services/guestVisitApi.ts), with the root's
[`VisitStore`](../src/stores/visit.store.ts) owning the stored visit token, the current visit, and its
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
    hasIdentity -- no device token --> activeSession
    hasIdentity -- token only --> activeSession
    hasIdentity -- yes --> identityShown[Show locally saved<br/>name and phone]
    identityShown -. menu .-> identityActions{Identity actions}
    identityActions -. "Opt Out" .-> revokeSms[DELETE SMS subscription]
    revokeSms --> notificationState
    identityActions -. "Forget Information" .-> confirmForget{Confirm forgetting<br/>saved information?}
    confirmForget -- no --> identityShown
    confirmForget -- yes --> forgetIdentity[Remove local profile<br/>and device token]
    forgetIdentity --> hasIdentity
    identityActions -. "Show Device ID" .-> showDeviceId[Show device ID dialog<br/>with copy action]
    identityShown --> deviceAuth[Authenticate notification status<br/>with the device token]
    deviceAuth --> notificationRequest{Status retrieval}
    notificationRequest -- pending --> notificationLoading[Show loading indicator]
    notificationRequest -- failed --> notificationError[Show notification status error]
    notificationRequest -- succeeded --> notificationState{SMS consent state?}
    notificationState -- yes --> notificationEnabled[Show "Notifications Enabled"]
    notificationState -- prior STOP --> startRequired[Explain that START is required;<br/>show the Twilio sender]
    notificationState -- no --> notifyButton[Show "Notify Me About Updates"]
    startRequired -. opens .-> smsComposer[Open a prefilled SMS<br/>containing START]
    smsComposer -. returns .-> startRequired
    startRequired -. check again .-> deviceAuth
    notifyButton -. opens .-> offer{Consent dialog:<br/>approve the full SMS terms?}
    offer -- yes --> subscribed[Save consent for the guest;<br/>server finds their current-market visit<br/>for any catch-up text]
    offer -- no --> notifyButton
    subscribed --> notificationEnabled
    notificationEnabled --> activeSession{Market session active?}
    startRequired --> activeSession
    notifyButton --> activeSession
    notificationError --> activeSession

    activeSession -- no --> inactiveIdentity[Show identity card:<br/>saved identity or offer to save information]
    inactiveIdentity -. "Save my information" button .-> signupRoute
    inactiveIdentity --> inactiveScreen([Inactive market card:<br/>next registration window,<br/>lottery, and notification details])
    activeSession -- yes --> hasVisit{Saved visit token<br/>on this device?}
    hasVisit -- yes --> currentVisit{Visit belongs to this market<br/>and is not cancelled?}
    currentVisit -- yes --> status[Visit status or outcome screen]
    currentVisit -- no --> canRegister
    hasVisit -- no --> canRegister{Registration open?}

    canRegister -- yes --> cachedIdentity{Cached local<br/>name and phone?}
    cachedIdentity -- no --> combinedForm[Sign-up fields — name, phone —<br/>plus lottery-entry fields — age range,<br/>household size, children/seniors —<br/>shown together, one submit]
    cachedIdentity -- yes --> lotteryOnlyForm[Show saved identity card and<br/>lottery-entry fields only:<br/>age range, household size,<br/>children/seniors]
    canRegister -- no --> nonOpenIdentity[Show identity card:<br/>saved identity or offer to save information]
    nonOpenIdentity -. "Save my information" button .-> signupRoute
    nonOpenIdentity --> phase{Which active phase is<br/>the session in?}
    phase -- registration closed<br/>or lottery pending --> closedScreen([Registration-closed screen])
    phase -- service underway --> inServiceScreen([In-service screen])

    signupRoute([Guest visits /signup]) --> alreadyIdentified{Already has a<br/>device token?}
    alreadyIdentified -- yes --> redirectHome[Redirect to /]
    redirectHome --> saved
    alreadyIdentified -- no --> signupOnlyForm[Sign-up form:<br/>name and phone only —<br/>no session or household data]
    signupOnlyForm --> signupSubmit["POST /api/guest-information<br/>(creates/updates the guest,<br/>no visit)"]
    signupSubmit --> saveSignupIdentity[Save entered name and phone,<br/>and any issued device token]
    saveSignupIdentity --> signupSuccess([Show "Your information is saved"<br/>on /signup])

    workerAdded([A worker adds the guest by hand,<br/>or a manager picks any guest's<br/>Actions menu and confirms who they are]) --> claimRoute["Guest scans the QR code:<br/>/claim#code"]
    claimRoute --> stripCode[Read the code, then remove it<br/>from the address bar]
    stripCode --> hasCode{Code in the link?}
    hasCode -- no --> missingCode([Ask a staff member<br/>to show the QR code again])
    hasCode -- yes --> phoneHasData{Phone already holds an<br/>identity or a visit?}
    phoneHasData -- yes --> replaceWarning[Warn that it will be replaced<br/>and cannot be recovered]
    phoneHasData -- no --> claimTap
    replaceWarning --> claimTap[Guest taps "Set up this phone"]
    claimTap --> claimSubmit["POST /api/guest-claim<br/>(single use, valid 15 minutes)"]
    claimSubmit -- refused --> claimFailed[Expired or already used:<br/>ask a staff member for a new code]
    claimSubmit -- accepted --> adoptIdentity[Save the issued device token,<br/>the returned name and phone,<br/>and a fresh visit token if the guest<br/>has a visit in today's session;<br/>a manager's override signs<br/>the old phone out]
    adoptIdentity --> open

    combinedForm --> questions[Answer this session's<br/>registration questions]
    lotteryOnlyForm --> questions
    questions --> identity{Saved device token?}
    identity -- yes --> submit["POST /api/lottery-registration<br/>with saved token"]
    identity -- no --> firstSubmit["POST /api/lottery-registration<br/>without a device token"]
    firstSubmit --> saveIdentity[Save entered name and phone<br/>in this browser only]
    submit --> saveIdentity
    saveIdentity --> registered[Visit created: registered]
    registered --> status

    status --> regClosed[Registration closes<br/>30-second grace period<br/>push/sms: registration_closed]
    regClosed --> lotteryPending[lottery_pending:<br/>registration pool frozen]
    lotteryPending --> lottery{Lottery}
    lottery -- selected --> waiting[waiting: guest sees their place in line<br/>and how many are ahead<br/>push/sms: lottery_selected]
    lottery -- not selected --> notPlaced([not_placed<br/>push/sms: lottery_not_selected])

    waiting --> called["Worker calls the guest: called<br/>screen switches to 'it's your turn'<br/>push/sms: called"]
    called --> served([served])
    called --> noShow([no_show])
    noShow -. "worker returns them<br/>to the queue" .-> waiting

    status -. "guest taps cancel while<br/>registered or waiting" .-> confirmCancel{Confirm giving up<br/>their place?}
    confirmCancel -- no --> status
    confirmCancel -- yes --> cancelled[cancelled]
    cancelled --> canRegister
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
  that browser-local copy; it never retrieves a guest profile from the server — with the one
  exception of a worker's QR code, below. A legacy token with no local profile therefore shows no
  indicator until the guest registers again.
- **A worker's QR code puts a guest they added by hand onto the guest's own phone.** An admin-added
  guest has no device credential, and their visit's token was never handed out, so nothing on a
  phone can follow them. After a manual add, the admin feedback line offers "Show QR code for their
  phone" (except for an after-the-fact `served` record), which asks `/api/admin/guest-claims` for a
  single-use code valid for fifteen minutes and shows it as a QR code linking to `/claim#<code>`.
  The code rides in the URL fragment, so it never reaches a server log or link preview, and
  `ClaimView` removes it from the address bar as soon as it has read it. Nothing happens until the
  guest taps "Set up this phone": the code is single-use, and a phone that already holds an identity
  or a visit — possibly someone else's — is warned first, because claiming replaces both and the
  server keeps only hashes, so what was there cannot be recovered. `/api/guest-claim` (rate-limited
  alongside the other public writes) issues the phone a device token, gives the guest's visit in
  the current session a fresh visit token, and returns the name and phone the worker entered. This
  is the one place a guest profile is read back from the server, which is acceptable because the
  code that authorizes it was handed to that guest in person. `GuestClaimStore` saves both
  credentials through `GuestStore.adopt` and `VisitStore.submit`; `adopt` clears the previous
  guest's notification state at once and reloads consent for the guest now on the phone. A worker
  can only issue a code for a guest no phone holds who was added in the last fifteen minutes. A
  manager (`manage:guest-access`) can issue one for any guest from the guest's Actions menu —
  including one already on another phone, after confirming the phone number on file. Scanning that
  override signs the old phone out: its device credential stops matching, the visit is re-keyed, and
  any push subscription on the visit is dropped. Every code records which device credential it may
  replace, so it fails if the guest changed phones after it was issued. See
  [`roles.md`](roles.md#putting-a-guest-on-a-phone) for the security reasoning.
- **`/signup` is its own route (`SignupView.tsx`) for creating a guest identity without a visit.**
  Saving information (name and phone, via `/api/guest-information`) is decoupled from lottery
  registration.
  `SignupView` redirects to `/` as soon as it mounts if the browser already has a device token —
  there's nothing left to ask, so the guest lands back on `GuestView`, which shows whatever its
  normal status resolution decides (lottery form, visit status, or the current session status). A
  browser with no device token instead sees the identity-only form and, on success, an inline
  "your information is saved" message on `/signup` itself. The unidentified
  `GuestIdentityCard` provides the in-app link into this flow; a guest can also land on
  `/signup` directly, e.g. from a QR code.
  `GuestSignupForm` renders only the identity fields (`GuestInformationForm`, submitted through
  `GuestStore.signUp`, no visit created). `GuestCombinedForm` renders the lottery-entry fields
  (`GuestLotteryForm`) plus the identity fields unless the device already has a cached local
  identity. Both are zero-prop store consumers and read and write the in-progress fields through
  the shared `RegistrationStore`.
- **Signing up and entering the lottery are visually one screen but two components.**
  `GuestCombinedForm` composes `GuestInformationForm` (name, phone) and `GuestLotteryForm` (age
  range, household size, children/seniors, per-session questions) inside a single `<form>`, while
  `GuestSignupForm` composes only `GuestInformationForm`. Both reuse `GuestForm` for their shared
  heading, submission state, error, button, and privacy treatment. Market registration submits to
  `/api/lottery-registration`; the standalone sign-up path submits to `/api/guest-information` and
  creates no visit. Lottery registration carries the same identity fields and invokes the shared
  guest-information persistence service inside the visit transaction, so both writes succeed or
  fail together.
- **Market status and visit status remain separate.** `VisitStore` keeps its current visit scoped
  to the market being displayed by matching `marketEventId` whenever either side loads, then
  `GuestView` composes that guest-specific state with `MarketSessionStore.currentStatus`. A
  current-market visit can show registration, queue, call,
  or outcome details; a cancelled visit falls back to the market state so the guest can register
  again while registration remains open. A visit from another market cannot override today's
  screen. When there is no visit to present, `registration_closed` and `lottery_pending` share one
  card — both phases only reach a guest who never registered, so both apologize for the missed
  window and point at next Saturday. There is no separate client-side card-state or session-phase
  model beyond those server-owned statuses.
- **Household composition — age range, household size, and how many children/seniors (55+) the
  guest is shopping for — is entered fresh at every visit and lives only on `visits`, not on the
  guest's identity.** `GuestLotteryForm` asks for these details each time a guest enters a session's
  lottery; the browser separately keeps its own last-entered copy in `localStorage`
  (`bay-compassion.guest-household`) purely to prefill that form next time — it's never sent to the
  server as part of identity, and never read back from a server-side guest profile. Without saved
  counts, household size defaults to 1 and children and seniors each default to 0. See
  [`data-model.md`](data-model.md) for how this moved off `guests`. Each visit also snapshots the
  normalized phone number so later reconciliation can see earlier values after a guest renews their
  identity.
- **The visit status polls.** The root's `VisitStore` re-checks `/api/visit` on a timer for as long
  as the visit may still change — `registered`, `waiting`, `called`, or `no_show` — so the guest
  sees the lottery result, call, or return to the queue even without notifications, and keeps doing
  so if they wander to another route on the same device. Push is a convenience, never the only
  channel. That schedule is shown, not hidden: while a refresh is pending, the visit card carries a
  countdown to the next update and tells the guest they do not need to reload — a screen that looks
  frozen is what sends someone to the browser's refresh button in the first place. Separately, the
  application-level `MarketSessionStore` re-checks `/api/market` every five seconds while the page
  is visible. It pauses while the page is hidden or suspended, then refreshes immediately when the
  guest returns. Both the guest and admin screens observe that same state, so a guest sitting on
  the closed screen sees registration open without reloading, and the form countdown receives a
  new `registrationClosesAt` if an admin closes registration early or extends the window.
- **A waiting guest is told where they stand.** `/api/visit` returns their `queue_position` and how
  many waiting guests are ahead of them, so they can judge whether to stay by the door or sit down.
  Once called, the whole card is replaced by an "it's your turn" panel rather than a changed status
  word — a guest glancing at their phone from across the room has to catch it.
- **An admin can add a guest directly, at any stage of the session.** The worker fills in the same
  identity and household form components a guest uses, inside a dialog, so the two never drift
  apart; those components write to the shared `RegistrationStore`, which the dialog empties each
  time it opens so a worker's own remembered details never leak into another guest's record. The
  resulting visits are created with `source: admin` — and can be handed to the guest's phone with a
  QR code, as above — and how far the session has progressed decides what the worker may choose — see `admissionsFor` in
  [`src/services/guestAdmission.ts`](../src/services/guestAdmission.ts):
  - While registration is open or in its grace period, the worker picks between entering the guest
    in the lottery (`registered`, no
    queue position, exactly like a self-registration) and handing them a spot outright (`waiting`,
    at the front of the waiting guests or the end). A reserved spot comes out of `capacity`, so it
    is one fewer place for the draw to give away.
  - A guest entered into the lottery can also be given better odds — the worker picks a named tier
    (standard, higher, highest) which maps to a `lottery_weight` multiplier. This shifts the odds
    without guaranteeing anything: a weighted guest can still miss out. Only a worker can set it,
    and only on a guest going into the draw; a self-registration is always weighted 1.
  - Once the grace period ends (`lottery_pending`), the lottery pool is frozen. From then through
    service, a walk-in can only go straight into the line.
  - Once the session has ended, the only thing left to record is `served` — someone who was handed
    food outside the app. That visit never joins a queue.
  - At any time — during a session, or between sessions when there is none and it is the only
    choice — the worker can **just save their details** (`manualAdmissionsFor`). That creates the
    guest with no visit and no device credential, skips the household fields (they belong to a
    visit), and still offers the QR code, so the guest's phone can take the record over and register
    itself next time. The guest database lists guests with no visit — these, and anyone who only
    used `/signup` — with the status "No visit" and no queue actions.
- **Notifications are best-effort.** SMS requires an explicit consent step (separate from just
  having a phone number on file) and Twilio to be configured. Consent belongs to the guest, so it
  applies to future visits until the guest revokes it. `GuestStore` sends the browser-local device
  credential to the authenticated `/api/notification-status` endpoint during initialization,
  which hashes it to identify the guest and restores consent without exposing profile data. The
  same credential authorizes `/api/sms-subscription`; no visit token participates in consent. On a
  new opt-in, the server looks up the guest's visit in the newest non-ended market event and sends
  the appropriate catch-up text if that visit has a live status. If the guest previously sent
  `STOP`, the notification status includes the Twilio sender that received it. The consent dialog
  explains that the guest must send `START`, opens a prefilled text to that sender, and lets the
  guest check again after returning to the app. The identity indicator shows a
  loading indicator while retrieving notification state, a local error if retrieval fails, and a
  single SMS opt-in button before consent that becomes a compact enabled status afterward. The
  identity card's menu lets the guest revoke SMS consent, forget the locally stored identity and
  device credential, or view and copy that credential as their device ID. A guest without a device
  credential instead sees a preregistration message and button in the indicator, explicitly
  clarifying that preregistration does not enter the lottery. Push notification plumbing remains in
  place, but push controls are not currently shown to guests.
  Admin broadcasts still reach eligible visits over any subscribed channel whose visit isn't cancelled.
- **Cancelling is only possible before service.** The cancel button appears only while the visit is
  `registered` or `waiting`, and not at all once the session has ended. It asks first, in the
  confirmation sheet `App` mounts for every screen (`ConfirmationDrawer`, driven by the root's
  `ConfirmationStore`) — the same sheet every admin confirmation uses. Nothing is sent to
  `/api/visit` until the guest confirms in it.
- **An ending session resolves anyone left over.** However a session ends — closed, auto-closed,
  or reset — every visit still `registered`, `waiting`, or `called` becomes `cancelled`, so nobody is
  left holding a status that implies service is still coming, and nobody is marked a no-show for a
  session the market ended. See [`session-lifecycle.md`](session-lifecycle.md#the-visit-lifecycle) for the full
  set of visit transitions.

## Dev Mode guest previews

Loading a demo scenario returns credentials only for the fake guests it creates. The Dev Mode
picker opens the selected guest in a separate tab, using the same guest screens and APIs shown
above. That tab stores identity, language, household defaults, and visit credentials in its own
session-storage namespace, leaving the normal browser identity unchanged. Refresh preserves the
preview; exiting clears it. Notification enrollment is disabled in preview tabs. An ended demo
visit expires normally, showing the regular post-session guest experience.
