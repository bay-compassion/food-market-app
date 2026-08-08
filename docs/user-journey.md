<!-- diagram-sources: src/App.vue=9a487918a638, netlify/services/guestRegistration.ts=5c884d4a99fa, netlify/functions/visit.ts=b7eb1f2c7f5d -->

# Guest journey

The path a guest takes from opening the app to being served, and the state their visit is in at each
step. The guest-facing screens are all in [`src/App.vue`](../src/App.vue); the endpoints they call
are `/api/market` (is registration open?), `/api/guests` (register), and `/api/visit` (check status,
cancel).

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

    canRegister -- no --> closed([Closed screen:<br/>no session to join right now])
    canRegister -- yes --> kind{New or returning guest?}

    kind -- new --> newForm[Name, age, household size,<br/>phone, new PIN]
    kind -- returning --> returningForm[Phone and PIN]
    newForm --> questions[Answer this session's<br/>registration questions]
    returningForm --> questions
    questions --> submit[Submit]

    submit --> registered[Visit created: registered]
    registered --> offer{Enable notifications?}
    offer -- yes --> subscribed[Push subscription saved]
    offer -- no --> status
    subscribed --> status

    status --> regClosed[Registration closes<br/>push: registration_closed]
    regClosed --> lottery{Lottery}
    lottery -- selected --> waiting[waiting, with a queue position<br/>push: lottery_selected]
    lottery -- not selected --> notPlaced([not_placed<br/>push: lottery_not_selected])

    waiting --> called[Admin calls the guest: called<br/>push: called]
    called --> served([served])
    called --> noShow([no_show])

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
- **The status screen polls.** It re-checks `/api/visit` on a timer, so the guest sees the lottery
  result and the call even without notifications — push is a convenience, never the only channel.
  It also re-checks `/api/market`, so a guest sitting on the closed screen sees registration open
  without reloading.
- **An admin can register a walk-up guest directly.** Those visits are created with `source: admin`
  and skip straight to `waiting` — they bypass the lottery entirely rather than starting at
  `registered`.
- **Notifications are best-effort.** Push requires a browser that supports it, and on iOS the app
  must be installed to the home screen first. Admins can also send a broadcast message to everyone
  in the session whose visit isn't cancelled.
- **Cancelling is only possible before service.** The cancel button appears only while the visit is
  `registered` or `waiting`, and not at all once the session has ended.
