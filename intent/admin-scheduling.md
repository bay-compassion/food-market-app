# Admin scheduling

**Originator:** Matt Strom · **Stage:** 1 — Capture intent · **Status:** Draft, awaiting product owner review

## Problem

Market events happen on a largely regular schedule, but every session is set up and started by
hand. Before each market, staff have to create a session, enter its registration window and
capacity, and schedule or open it. After service, someone has to remember to close it. That is
repetitive work for a small staff, and anything missed shows up for guests: a market nobody opened,
or one left open after everyone has gone home.

Development has a related problem. Testing a session end to end means waiting for its times to
come around, or hand-crafting sessions whose times happen to be right now.

## Proposed outcome

A new **Schedule** tab in the admin dashboard where staff set the market's schedule once, and the
app takes it from there.

- **Recurrence pattern.** Staff describe the regular schedule once. A pattern repeats weekly on the
  weekday of its date, and runs until staff delete it. A pattern holds:
  - the date it repeats from
  - registration open time
  - registration close time (1 hour after opening by default)
  - capacity
  - the delay between registration closing and the lottery draw
  - the auto-close time, as a relative amount such as 12 hours
  - the registration questions

  The pattern replaces today's idea of a `draft` session: it is the template sessions are made
  from, not a session itself. There is one pattern at a time for now, but nothing should assume
  there can only ever be one — supporting several later should not take a large effort.

- **Next session created automatically.** The moment the current session closes, the app creates
  the next session from the pattern. Guests immediately see when the next market opens, and it
  opens on its own when the time comes. The new session is a real `scheduled` session — the same
  status that already means "the next market" to guests — and the grid labels it **Pending**.
- **Automatic close.** Every session has an optional auto-close time, 12 hours by default. If the
  session is still open when that time arrives, it is closed automatically — which in turn creates
  the next session from the pattern. Sessions normally last under 3 hours, so 12 hours is a
  generous buffer. Staff can clear the auto-close time for a session they don't want closed
  automatically.
- **Scheduled lottery.** The lottery draws on its own once the configured delay after registration
  closes has passed, instead of waiting for staff to press a button. While the draw is pending,
  staff can **Run Immediately** to draw now, or **Postpone** to push it back a little — 5 to 10
  minutes at most, at least at first. The delay is optional: leave it empty and staff draw the
  lottery by hand, as they do today.
- **Start Now.** Staff can take the upcoming session and start it immediately instead of waiting for
  its time. This is mainly for development. When a session started this way closes, the app works
  out the next session from the pattern again — and recreates the same week's session, even though
  its date is still ahead. Starting Tuesday's session early on Monday therefore yields a fresh
  Tuesday session afterwards.
- **One-off sessions.** Staff can add a single session outside the pattern, which is mostly useful
  during development.
- **Market location.** Sessions happen at a market location, and the location owns the time zone
  that session times are read in. For now there is exactly one location — The Bay Church in
  Concord, CA, on Pacific Time — and everything assumes it. Recording the location is foresight
  for a possible second site, not multi-location support: there is no location picker or
  per-location view yet.
- **One session at a time.** A session cannot start while another session is still active; the
  start is blocked, not queued or skipped. Real markets are unlikely to overlap, but development
  sessions might.

The tab shows:

- A **month calendar** (MUI `DateCalendar`) with a pip on every date that has a session. Future
  dates are worked out from the pattern for whichever month is on screen; no sessions are created
  just to draw a pip.
- A **grid** (MUI DataGrid) of events, newest first, with columns for the date, registration open
  time, lottery time, status, and actions. Clicking a date on the calendar selects that date in the
  grid and shows the sessions on that day.
- Each recurrence pattern appears as **a single special row**. It is not a session; it is backed by
  the pattern itself. Its Date column describes the pattern ("Every Tuesday") rather than naming a
  date, and the row is pinned to the top of the grid. Clicking a future calendar date that only the
  pattern covers selects the pattern row.
- Grid statuses: the pattern row, **Pending** (the next session, already created), **Active**, and
  **Closed**.
- Row actions to start a session now and to delete one; grid actions to add a one-off session or a
  recurrence pattern.

`draft` and the `ad_hoc` session mode both go away. The recurrence pattern takes over the role of
`draft`, and a one-off session with Start Now covers what `ad_hoc` was for.

**Out of scope for now:** skipping a single date (such as a holiday) or changing one occurrence
without changing the pattern. That is a future feature.

## Affected users and systems

- **Staff and admins** — use the new tab, and no longer create or start regular sessions by hand.
- **Guests** — see the next market as soon as the previous one closes, and learn their lottery
  result at a predictable time rather than whenever staff press the button. Nothing else about
  registration or the queue changes for them.
- **Session lifecycle** (`src/services/sessionStateMachine.ts`, `netlify/services/marketSession.mts`)
  — loses `draft`, `ad_hoc`, and the commands built around them, and gains an automatic lottery
  draw, automatic close, and creating the next session on close.
- **Database** — a new `market_locations` table holds each location and its time zone, seeded with
  The Bay Church. `market_events` gains the lottery draw time and the auto-close time; the
  recurrence pattern and its registration questions need somewhere to live.
- **Background jobs** — something has to draw the lottery and close a session at their times even
  when nobody is using the app. Registration close already works this way
  (`netlify/functions/market-registration-close.mts`).
- **Existing admin session screens** — the Session tab's settings form currently offers session
  modes and edits `draft` sessions.
- **Docs** — `docs/session-lifecycle.md` describes `draft` and `ad_hoc` and will need to change.

## Constraints

- Admin-only. Admin text does not need to be localized.
- Mobile first: the tab has to work on a phone, since that is how staff run the market.
- Only one unfinished session exists at a time. The app picks "the current session" by that rule
  today, and this feature keeps it.
- Times are local to the market location and respect daylight saving time: a 9am market stays 9am
  in Concord all year, and dates are decided in Pacific Time, not UTC.
- Use MUI's `DateCalendar` and the MIT DataGrid; the paid DataGrid plans are not an option.
- Existing session data will be purged before the migration lands — the app is not in production
  yet, so no data needs to be carried over.
- Migrations need a human to review and merge them (`docs/migrations.md`).

## Open questions

1. **Auto-close from what?** Is the 12 hours counted from when registration opens, from when the
   session actually started (which differs after Start Now), or something else?
2. **Auto-closing an unfinished session.** Closing normally happens after the lottery and service.
   If auto-close fires while registration is still open or the lottery hasn't drawn, what happens
   to guests who registered? (Today, closing turns anyone still waiting or called into a no-show.)
3. **Deleting.** On the pattern row, does delete remove the pattern (and its Pending session)?
   Sessions that already have visits cannot be deleted without losing report data.
4. **One-off sessions alongside the pattern.** A one-off session added while the pattern's next
   session already exists would make two unfinished sessions. Does the one-off replace it, wait
   behind it, or is adding one blocked until the current session closes? Are one-off sessions
   available in production or only in development?
5. **Pending session edits.** Can staff edit the upcoming session (times, capacity) without changing
   the pattern? Today settings can only be edited while a session is a `draft`.
6. **The Session tab.** Does session setup move entirely to the Schedule tab, or does the Session
   tab keep any of it?
7. **Grid on a phone.** Five columns are cramped at phone width. Is a narrower layout needed, or is
   this tab mostly used on a larger screen?
