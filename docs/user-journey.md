<!-- diagram-sources: src/App.vue=07ab22ebe1dc, src/components/guest-view/GuestQueueScreen.vue=a5bff8180201, src/services/guestVisitApi.ts=ed65085ea3a5, netlify/services/guestRegistration.mts=2345f47897e4, netlify/functions/visit.mts=2cf92eed3b8a -->

# Guest journey

The path a guest takes from opening the app to being served, and the state their visit is in at each
step. Language selection lives in [`src/App.vue`](../src/App.vue); the registration form, status
screen, and countdown are in
[`src/components/guest-view/GuestQueueScreen.vue`](../src/components/guest-view/GuestQueueScreen.vue),
which calls `/api/market` (is registration open?), `/api/guests` (register), and `/api/visit` (check
status, cancel) through
[`src/services/guestVisitApi.ts`](../src/services/guestVisitApi.ts).

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

    saved --> hasVisit{Saved visit token<br/>on this device?}
    hasVisit -- yes --> status[Status screen]
    hasVisit -- no --> canRegister{Registration open?}

    canRegister -- yes --> kind{New or returning guest?}
    canRegister -- no --> closed{Event exists and its<br/>window hasn't passed yet?}
    closed -- no --> closedScreen([Closed screen:<br/>no session to join right now])
    closed -- yes --> earlyLink([Closed screen offers a<br/>'sign up early' link to /signup])
    earlyLink -. "guest follows the link" .-> kind

    kind -- new --> newForm[Name, age range,<br/>household size,<br/>children/seniors shopping for,<br/>phone, new PIN]
    kind -- returning --> returningForm[Phone and PIN]
    newForm --> questions[Answer this session's<br/>registration questions]
    returningForm --> questions
    questions --> submit[Submit]

    submit --> registered[Visit created: registered]
    registered --> offer{Enable push and/or<br/>SMS notifications?}
    offer -- yes --> subscribed[Subscription(s) saved<br/>per channel chosen]
    offer -- no --> status
    subscribed --> status

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

- **The visit token is the guest's login.** Registering stores a token on the device
  (`bay-compassion.visit-token` in local storage); every later status check and the cancel action
  authenticate with it. There is no guest account to sign into — clearing browser storage loses
  access to the visit.
- **A returning guest proves who they are with phone number plus PIN.** Repeated wrong PINs are
  rate-limited per phone number (`guest_pin_attempts`), and a returning guest can optionally update
  their stored profile while registering.
- **`/signup` lets a guest register ahead of the window, as soon as any event exists.** The server
  allows self-registration for any status up through `registration_open` — including `draft`,
  before an admin has scheduled anything — and only blocks it once the window has genuinely passed
  (`registration_closed`, `service_started`, `ended`). The `/` route only shows the form once
  registration is actually open; `/signup` renders the same `GuestSignupCard` component but
  bypasses that client-side wait, so it also doubles as a way to exercise the form locally without
  forcing a session into `registration_open`. `GuestSignupCard` takes a `context` prop
  (`'queue' | 'early'`) that swaps the form/success copy — "join the queue" only reads correctly
  once registration is genuinely open, so `GuestQueueScreen.vue` derives `context` from whether registration is
  actually open right now, not from which route rendered the card.
- **Household composition — age range, household size, and how many children/seniors (55+) the
  guest is shopping for — lives on the guest profile and is snapshotted onto each visit.** A
  returning guest who isn't updating their profile doesn't see those fields again; the visit is
  created with whatever values are already on file, so the numbers stay accurate for reporting
  without asking the same questions every time.
- **The status screen polls.** It re-checks `/api/visit` on a timer for as long as the visit is
  live — `registered`, `waiting`, or `called` — so the guest sees the lottery result and the call
  even without notifications. Push is a convenience, never the only channel. It also re-checks
  `/api/market`, so a guest sitting on the closed screen sees registration open without reloading.
  The same `/api/market` re-check also runs on a short interval while a guest is actively filling
  out the registration form, not just once the visit exists — that's what keeps the countdown
  clock's `registrationClosesAt` correct if an admin closes registration early or extends the
  window after the page loaded. The poll only runs while registration is genuinely open; a session
  that's scheduled, closed, or between markets never triggers it.
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
  retried on its own. Admins can also send a broadcast message to everyone in the session, on
  whichever channel(s) they're subscribed to, whose visit isn't cancelled.
- **Cancelling is only possible before service.** The cancel button appears only while the visit is
  `registered` or `waiting`, and not at all once the session has ended.
- **A closing session resolves anyone left over.** Ending a session marks every visit still
  `waiting` or `called` as `no_show`, so nobody is left holding a status that implies service is
  still coming. See [`session-lifecycle.md`](session-lifecycle.md#the-visit-lifecycle) for the full
  set of visit transitions.
