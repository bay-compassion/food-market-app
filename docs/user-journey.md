<!-- diagram-sources: src/App.vue=f4a63ea67aad, src/components/guest-view/GuestView.vue=fd244225ef4d, src/services/guestCardState.ts=ee78768cc725, src/services/guest.store.ts=2c93c96b30e4, src/services/guestVisitApi.ts=3d96b156d4f2, src/services/root.store.ts=0d514c1568d7, src/services/market-session.store.ts=b8807b609880, src/services/page-visibility-poller.ts=4900a5d7e4b0, netlify/services/guestRegistration.mts=db37a56e6484, netlify/functions/visit.mts=2cf92eed3b8a -->

# Guest journey

The path a guest takes from opening the app to being served, and the state their visit is in at each
step. Language selection lives in [`src/App.vue`](../src/App.vue); the registration form, status
screen, and countdown are in
[`src/components/guest-view/GuestView.vue`](../src/components/guest-view/GuestView.vue),
which reads the current market session from the shared
[`src/services/root.store.ts`](../src/services/root.store.ts). The root's
[`MarketSessionStore`](../src/services/market-session.store.ts) polls `/api/market` (is registration
open?),
while the root's [`GuestStore`](../src/services/guest.store.ts) owns the device credential used by
`/api/guests` (register for a session), `/api/guest-signup` (identity only, no session), and
`/api/notification-status` (retrieve consent). `/api/visit` (check status, cancel) is called
through [`src/services/guestVisitApi.ts`](../src/services/guestVisitApi.ts).

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
    hasIdentity -- yes --> identityShown[Show locally saved<br/>name and phone]
    hasIdentity -- no --> hasVisit
    identityShown --> deviceAuth[Authenticate notification status<br/>with the device token]
    deviceAuth --> notificationState{Notifications enabled?}
    notificationState -- yes --> notificationEnabled[Show "Notifications Enabled"]
    notificationState -- no --> notifyButton[Show "Notify Me About Updates"]
    notifyButton -. opens .-> offer{Consent dialog:<br/>enable push and/or SMS?}
    offer -- yes --> subscribed[Subscriptions saved<br/>per channel chosen]
    offer -- no --> notifyButton
    subscribed --> notificationEnabled
    notificationEnabled --> hasVisit{Saved visit token<br/>on this device?}
    notifyButton --> hasVisit
    hasVisit -- yes --> status[Status screen]
    hasVisit -- no --> canRegister{Registration open?}

    canRegister -- yes --> cachedIdentity{Cached local<br/>name and phone?}
    cachedIdentity -- no --> combinedForm[Sign-up fields — name, phone —<br/>plus lottery-entry fields — age range,<br/>household size, children/seniors —<br/>shown together, one submit]
    cachedIdentity -- yes --> lotteryOnlyForm[Lottery-entry fields only:<br/>age range, household size,<br/>children/seniors]
    canRegister -- no --> phase{Which phase is<br/>the session in?}
    phase -- not open yet --> alreadySignedUp{Device token<br/>already issued?}
    alreadySignedUp -- yes --> notOpenScreen([Not-open screen:<br/>no session to join right now])
    alreadySignedUp -- no --> earlyLink([Not-open screen offers a<br/>'sign up early' link to /signup])
    earlyLink -. "guest follows the link" .-> signupOnlyForm[Sign-up form:<br/>name and phone only —<br/>no session or household data]
    signupOnlyForm --> signupSubmit["POST /api/guest-signup<br/>(creates/updates the guest,<br/>no visit)"]
    signupSubmit --> saveSignupIdentity[Save entered name and phone,<br/>and any issued device token]
    saveSignupIdentity --> notOpenScreen
    phase -- registration closed --> closedScreen([Registration-closed screen])
    phase -- service underway --> inServiceScreen([In-service screen])
    phase -- ended --> endedScreen([Ended screen])

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
- **`/signup` lets a guest create their identity ahead of any session, whether or not one exists
  yet.** Signing up (name and phone, via `/api/guest-signup`) is decoupled from any market
  event — `resolveGuestCardState` in `guestCardState.ts` offers it purely off whether the device is
  already identified (`isIdentified`, i.e. has a device token), independent of `marketEvent`. Once
  registration is genuinely open, `/signup` and `/` render the same thing — `resolveGuestCardState`
  derives `context` from whether registration is actually open right now, not from which route
  rendered the card, so a guest who happens to still be on `/signup` once registration opens sees
  the ordinary queue form. `GuestRegistrationForm` (the composer) takes a `context` prop
  (`'queue' | 'early'`): `'early'` renders only the identity fields (`GuestSignupForm`, submitted
  through `GuestStore.signUp`, no visit created); `'queue'` renders the lottery-entry fields
  (`GuestLotteryForm`) plus the identity fields too, unless the device already has a cached local
  identity to skip re-asking for.
- **Signing up and entering the lottery are visually one screen but two components.**
  `GuestRegistrationForm` composes `GuestSignupForm` (name, phone) and `GuestLotteryForm` (age
  range, household size, children/seniors, per-session questions) inside a single `<form>` — one
  submit either way, so the wire contract to `/api/guests` for a lottery entry is unchanged. Only
  the standalone `'early'` sign-up path talks to a different endpoint (`/api/guest-signup`) and
  creates no visit.
- **The "not open yet" screen, once past, gives way to three more screens with their own
  copy — registration-closed, in-service, and ended — instead of one generic "closed" message.**
  `currentSessionPhase` in `guestCardState.ts` is the single place that maps a session's status and
  the current time to one of these phases; `GuestView.vue` renders `GuestNotOpenState`,
  `GuestRegistrationClosedState`, or `GuestServiceState` (with `has-ended` distinguishing
  in-service from ended) accordingly. Before `/api/market` has ever resolved — including when it's
  unreachable — the resolver optimistically assumes registration is open rather than showing a
  "not open" screen it can't actually confirm.
- **A schedule information alert tells a guest when to come back, except while it wouldn't make
  sense.** `GuestView.vue` shows `ScheduleInformation` above the rest of the screen whenever the
  phase isn't `registration-open` or `in-service` — i.e. before the window opens, after it closes
  but before the lottery runs, and once the session has ended. It's hidden while registration is
  open (the signup form is live) and while service is underway, since its copy ("sign-ups aren't
  open yet") would contradict either.
- **Household composition — age range, household size, and how many children/seniors (55+) the
  guest is shopping for — is entered fresh at every visit and lives only on `visits`, not on the
  guest's identity.** `GuestLotteryForm` asks for these details each time a guest enters a session's
  lottery; the browser separately keeps its own last-entered copy in `localStorage`
  (`bay-compassion.guest-household`) purely to prefill that form next time — it's never sent to the
  server as part of identity, and never read back from a server-side guest profile. See
  [`data-model.md`](data-model.md) for how this moved off `guests`. Each visit also snapshots the
  normalized phone number so later reconciliation can see earlier values after a guest renews their
  identity.
- **The status screen polls.** It re-checks `/api/visit` on a timer for as long as the visit is
  live — `registered`, `waiting`, or `called` — so the guest sees the lottery result and the call
  even without notifications. Push is a convenience, never the only channel. Separately, the
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
- **Notifications are best-effort, across two independent channels.** Push requires a browser that
  supports it, and on iOS the app must be installed to the home screen first. SMS requires an
  explicit consent step (separate from just having a phone number on file) and Twilio to be
  configured; a guest can enable either channel, both, or neither, and each is delivered and
  retried on its own. `GuestStore` sends the browser-local device credential to the authenticated
  `/api/notification-status` endpoint, which hashes it to identify the guest and reports prior
  consent without exposing profile data. Prior SMS consent is then attached to the current visit;
  push still requires a live subscription in the current browser. The identity indicator shows a
  single opt-in button before consent, opens the channel choices in a dialog, and replaces the
  button with a compact enabled status after either channel is activated. Admins can also send a
  broadcast message to everyone in the session, on whichever channel(s) they're subscribed to,
  whose visit isn't cancelled.
- **Cancelling is only possible before service.** The cancel button appears only while the visit is
  `registered` or `waiting`, and not at all once the session has ended.
- **A closing session resolves anyone left over.** Ending a session marks every visit still
  `waiting` or `called` as `no_show`, so nobody is left holding a status that implies service is
  still coming. See [`session-lifecycle.md`](session-lifecycle.md#the-visit-lifecycle) for the full
  set of visit transitions.
