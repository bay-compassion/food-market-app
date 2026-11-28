# Standby

**Status: design, not built.** This covers
[issue #51](https://github.com/bay-compassion/food-market-app/issues/51) (Phase 2 of the household
service work in [household-service.md](household-service.md)). It replaces the design on the
October `feat/standby-queue` branch. That branch is a source of parts, not something to rebase.

Standby works like an airline's standby list. Guests who are at the market, and missed the lottery
or were not drawn, can put themselves on a list. Joining early matters, but nothing is guaranteed.
Once the main line has been served, workers admit standby guests in the order they joined, for as
long as food lasts.

## Terms

The **postmarket track**, **standby** and the **S series** are one feature, named at three layers:

- `postmarket` is the visit's `track` in the database, next to `lottery` and `premarket`
  (`src/services/visit-track.ts`).
- "Standby" is what workers, and guests who are on it, see.
- `S1`, `S2`… is the label a standby guest carries, a third `QueueNumber` series next to the main
  numbers and the `P` series (`src/models/queue-number.ts`).

## Decided

- **Standby guests are full guests**, with an ordinary visit on the `postmarket` track. Not having
  to record their details is not a goal of this design. The count-only household tool stays as a
  fallback for households without a phone or who won't give details.
- **A guest's place is secured when they pull a ticket**, by scanning a standby QR code at the
  market. They fill in their details afterwards, while they wait.
- **The code is the same for the whole session**, valid for that session only, and shown on spare
  iPads (and possibly the kiosk). It is not printed and does not change while the session runs.
  Guests can't reach the shopping area before shopping starts, so a photo of the code texted
  off-site isn't worth stopping completely.
- **Guests have to be at the market to join.** Standby is never mentioned in printed or online
  materials (see the guest messaging policy). Workers tell guests about it on-site.
- **Standby opens when shopping actually starts**, which is when the first number is called. That is
  also when someone is at the queue desk. No clock, button or extra state is involved.
- **The scheduled Shopping Starts time is for display only.** Each session gets an explicit, configurable time
  for printed materials, guest copy and the dashboard (and, later, for other markets). It gates
  nothing.
- **The S series follows join order.** A worker calls "S7, Maria". The room is small, and guests
  gather near the queue desk at the end.
- **The guest's phone says "You're on the standby list"** with their S number, since that's what
  the worker reads out, but no count of who's ahead and no "now calling" row. When the guest is
  admitted, the card changes on its own with no text or push. Guests listen for their name.
- **Odds reflect lottery luck only.** The automatic odds, the steward's statistics and the lottery
  report read whether the draw picked a guest from the draw's own record. Shopping some other way,
  from standby or by a worker's later status correction, doesn't count as a win.
- **A standby guest is never marked a no-show.** A guest who doesn't come up when called is
  cancelled. Guests can also cancel themselves.

## How It Works

### A Standby Visit's Statuses

Standby reuses the existing visit statuses rather than adding new ones:

| Step                              | Status      | Command                    |
| --------------------------------- | ----------- | -------------------------- |
| Pulls a ticket and is on the list | `waiting`   | —                          |
| Admitted (their name is called)   | `called`    | `call`                     |
| Shops                             | `served`    | `serve`                    |
| Doesn't come up, or leaves        | `cancelled` | `cancel` (worker or guest) |
| Still on the list when it ends    | `cancelled` | the session's close        |

Only `served` counts towards service totals, so waiting on standby never counts as being served.

`VisitCommands` (`src/models/visit-commands.ts`) gains a postmarket branch, the same way it handles
premarket volunteers with `removesFromPremarket`:

- a worker can `cancel` from `waiting` and from `called`. This is new: today `cancel` belongs to the
  guest and only runs from `registered` and `waiting`.
- `mark_no_show` is never offered.
- `return_to_queue` takes a called guest back to `waiting`, keeping their S number. Undoing a
  mistaken cancel would be a new rule; see Defaults to Confirm.

Standby visits take none of the session's capacity, just as premarket visits don't.

### Pulling a Ticket

1. The iPad shows the session's standby code as a QR code, which opens `/standby#<code>`. Before
   standby opens, it shows "Standby opens when shopping starts" instead.
2. Scanning checks the code and that standby is open, then issues a **ticket**. The ticket is a
   single-use random token, stored as a hash, carrying the session, the next S number and the time
   it was issued. Handing out the S number here, rather than when the form is submitted, is what
   makes it follow join order. Scans that are abandoned just leave gaps in the S series.
3. The guest fills in the usual registration fields, without the lottery questions (as the
   premarket check-in does). A phone that has registered before only confirms its household.
   Submitting uses up the ticket and creates the visit with its S number, in one transaction.
4. If the guest already has a visit in this session, the server checks what it is:
   - `not_placed` (wasn't drawn), `cancelled` (including a guest a worker took off standby, who
     rejoins at the end of the list) or `no_show`: it moves onto the postmarket track with the
     ticket's S number, the way a premarket check-in takes over a guest's lottery entry. The move
     clears `queue_position`, `priority_number` and the line-order columns. Otherwise
     `QueueNumber.of` would still show the old main number, and reports would still count the
     visit as placed.
   - still in line, or already `served` (including a premarket volunteer): it stays as it is, and
     the ticket isn't used up. Their phone shows the card they already have.
5. **The phone keeps the ticket it was given** and never asks for a second: every ticket takes the
   next S number, so asking again on a reload would move the guest back down the list. A ticket
   lasts until the session ends.

**Allocating S numbers.** A ticket and a hand-added standby guest both need one, so the counter
can't live in the ticket table alone. Both paths allocate the next number the way P numbers are
allocated (`highestPriorityNumber` in `visitQueue.mts`), with a unique
`(market_event_id, standby_number)` constraint behind it. A ticket keeps the number it was given,
and the visit takes it when the ticket is used up.

The server checks that standby is open both when it issues a ticket and when it uses one up.
Hiding the QR code on the iPad is not enough.

**The code.** It's an HMAC of the session ID under a server secret, so it needs no table and stops
working when the session ends. The iPads unlock the way the room display does now, with an unlock
code rather than an Auth0 account (`view:kiosk` is gone; see [roles.md](roles.md)). The standby
code comes with the board data the display already reads.

### When Standby Opens

The rule: **standby is open while the session is `service_started` and its visit history records at
least one call since the session's latest draw.** Counting only calls since the latest draw matters
because `reset_session` cancels visits but leaves their history. Without it, a session that was
reset and drawn again would open standby before anyone had been called.

The rule reads the visit history (`visit_events`), not `visits.called_at`. `return_to_queue` clears
`called_at`, so if the only called guest is put back in line, a rule based on `called_at` would
close standby again with guests already on it. The visit history only ever grows, so standby opens
once and stays open, with no column or state to store. An accidental early call does open standby.
The design accepts that.

The rule only applies to guests scanning in. As proposed, a worker can add a standby guest by hand
once the draw has run, using a new `standby` admission (`src/services/guestAdmission.ts`). That also
covers a day when nobody is in the main line to call.

### On the Queue Desk

A Standby section sits below the main line, in S order, and shows each guest's S number, first name
and household size. A worker admits the next guest (`call`), marks them served, or cancels them.
Nothing is admitted automatically. Whether food is left is the worker's call.

Calling a standby guest sends no text or push. Both are queued for a call in `visitQueue.mts`
(`requeueNotification`, `deliverQueuedNotifications`), so that's where standby visits are skipped.

### Session End

`resolveOutstandingVisits` (`netlify/services/visitQueue.mts`) turns `called` visits into
`no_show`. Postmarket visits are excluded from that and are cancelled along with everyone else
still waiting.

### Reports

Session and monthly reports get standby subtotals next to the premarket and count-only ones:
households and household members served from standby. The served totals already include them,
since they're `served` visits.

## Shopping Starts

- `recurrence_patterns.shopping_starts_at` stores a local wall-clock `time`, like
  `registration_opens_at`. `market_events.shopping_starts_at` stores a `timestamptz` that each
  session can override. Postponing the lottery leaves it unchanged.
- **No backfill.** The columns are nullable and the migration only adds them. After it deploys, a
  worker sets Shopping Starts on the pattern, and on the current session too if guests have already
  joined it (saving the pattern leaves a joined session alone). The guest copy only reads the
  time from PR 1b onwards, and 1b ships after that setting is in place. A session with no time set
  falls back to copy without a time, written for all ten languages.
- `SessionMilestones` gives `service_starts` that time instead of `null`.
- The guest timeline, the waiting card's "Calling starts at …" and the help steps fill both times in
  from the session: the draw from `lotteryDrawsAt`, shopping from Shopping Starts. Both are
  formatted with `Intl.DateTimeFormat` in the market's time zone (`market_locations.time_zone`).
  Luxon stays out of the guest's first screen. `SaturdayClock` hard-codes the timetable (10:30,
  10:45, then 45 minutes to shopping) and `America/Los_Angeles`. It reads the session's times
  instead, and the guest's session data gains the location's time zone if it doesn't have it yet.
- The hard-coded `time` fields ("10:45 AM", "11:30 AM") come out of `Translation` and all ten
  locale dictionaries. Sentences with the time built in, like `nowCallingNone` and the Chinese
  timeline steps, become `{time}` templates instead.
- The guest guide shows these screens, so it has to be rebuilt.

## Risk: Visits Selected by Status

Premarket visits are `served` from the start, so code that picks visits out by status never sees
them. Postmarket visits pass through `waiting` and `called`, so **any code that selects visits by
status will pick up standby guests unless it also checks track.** The track PR has to go through
each of them. A first search found:

- the next guest to call and the line order (`netlify/services/visitQueue.mts`)
- Now Calling and the kiosk board (`netlify/services/queue-board.mts`)
- the queue desk (`src/stores/queue-desk.store.ts`)
- the guest's visit card (`src/stores/visit.store.ts`)
- placed-visit and no-show counts in reports (`netlify/services/reports.mts`, around line 227)
- call notifications (`visitQueue.mts`, and `netlify/services/pushNotifications.mts`)
- session close (above)
- the draw (`src/models/draw-entry.ts`)

That list came from one search. The PR should search again rather than trust it.

## Defaults to Confirm

These are proposals that haven't been agreed yet:

- Workers can add standby guests by hand from the draw onwards, before standby opens to guests
  scanning in.
- A guest who wasn't drawn and scans in keeps the same visit, which moves to postmarket, rather than
  getting a second one.
- The move overwrites the `not_placed` status, so that guest drops out of the session's not-placed
  count. Should reports still count guests who weren't drawn and then joined standby?
- Anyone still on standby when the session ends is cancelled.
- `return_to_queue` works on called standby guests and keeps their S number. Should it also undo a
  mistaken cancel (from `cancelled`), as a postmarket-only rule?

## Open Questions

- **The kiosk board.** Should called S numbers appear in Now Calling (for example as a pill, like
  P numbers), or nowhere? The design above shows them nowhere.
- **Showing a short list of names on the kiosk**, the way airport gate screens do. This needs the
  privacy design's sign-off, so it's left out for now.

## Plan

A stack of PRs. Each one ships and works on its own.

1. **Shopping Starts**, in two PRs:
   - **1a.** The columns (a purely additive migration), editing the time on the Schedule screen,
     and the milestone time on the dashboard. Nothing guest-facing reads it yet.
   - **1b.** Guest copy and `SaturdayClock` filled in from session times instead of hard-coded
     strings, in every language. Rebuild the guides. Standby doesn't depend on 1b, so it can land
     in parallel with the PRs below.
2. **The postmarket track and the S series.** `postmarket` in `VisitTrack`, the `S` series in
   `QueueNumber` with its own `standby_number` column (not `queue_position`, which other code
   reads), the `VisitCommands` branch, the session-close change, and the status-selection sweep
   above, on the server. The migration drops and re-adds `visits_track_check`, so it is not purely
   additive.
3. **Standby on the queue desk.** The Standby section, the `standby` admission for adding a guest by
   hand (allocating S numbers), S numbers on name tags, the client side of the status sweep (the
   queue desk's roster and session progress), and the standby subtotals in reports. This is the
   first PR that creates standby visits.
   - **Follow-up:** a ticket command that puts a guest the draw didn't place onto standby, keeping
     their visit. Adding them through the dialog today creates a second guest record, the known
     duplicate-guest problem with worker-added visits.
4. **The guest's standby card.** Built before scan-in, so a guest who joins lands on a finished
   card. "You're on the standby list" with their S number, the card changing when the guest is
   admitted, and cancelling from the phone. The copy goes into every language. It turns the phone
   QR code back on for standby, which PR 3 held back.
5. **Tickets and the code.** The code, the iPad screen, the ticket table (a migration), `/standby`
   and the form, the server-side check that standby is open, and moving a `not_placed` visit onto
   standby. Moving a guest who wasn't drawn leaves their visit `waiting`, then `served`, like a
   winner's, so everything that asks whether a guest was drawn reads the draw's own event instead
   of the status: `DrawEntry.won` (which the automatic odds and the steward's per-draw statistics
   use) and the lottery report's placement count. Ships as two PRs: 5a, the server, and 5b, the
   iPad display and the `/standby` page.

Before each migration PR, follow the checklist in [migrations.md](migrations.md). A person reviews
and merges it.

**How this maps to the issues.** PR 4, guests scanning in, is the work
[#303](https://github.com/bay-compassion/food-market-app/issues/303) (Phase 3) describes. #303
leaves open whether guests must be at the market, and this design settles that: yes. The iPads here
show a code. They aren't the shared entry devices
[#304](https://github.com/bay-compassion/food-market-app/issues/304) (Phase 4) describes. The
issues should be updated to match once this design is agreed.

## What to Take From the Old Branch

`feat/standby-queue` (October 2026) is useful for:

- the scan, then ticket, then form flow, and the single-use token spent with
  `UPDATE … WHERE consumed_at IS NULL`
- the HMAC code signing, minus the 30-second windows
- `e2e-queue/standby.spec.ts` as a starting point for an end-to-end test

Leave behind its `standby` and `standby_promoted` statuses, its `standby_position` column and its
rotating code. The postmarket track and the S series replace them.
