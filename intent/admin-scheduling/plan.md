# Admin scheduling — implementation plan

## Context

The intent (`intent/admin-scheduling/intent.md`, #137) and the spec
(`intent/admin-scheduling/spec.md`, #138) are approved. This is Stage 3 of the AI-native SDLC
playbook: a plan written in plan mode, detailed enough that an engineer who never saw this
conversation could build from it. Once it's approved it is committed verbatim as
`intent/admin-scheduling/plan.md`, next to its intent and spec. If the implementation departs from
it, `plan.md` is updated in the same commit.

One decision was made during planning, beyond the spec:

- **Neutral cancellation copy.** Guest copy for a `cancelled` visit currently says "You cancelled
  your place for today". Once ending a session resolves guests to `cancelled` (spec R20), that
  would blame guests for the market's action. The message is reworded to be neutral in all 7
  locales. Because it is being rewritten anyway, it also drops the hard-coded "next Saturday at
  10:30 AM".

Build-stage choices the spec left open:

- **Date library: Luxon** (`luxon` 3.7, `@types/luxon`). Its IANA time zone and DST handling is
  sound, it works unchanged in Node and the browser, and `AdapterLuxon` supports the pickers'
  `timezone` prop. Day.js's timezone plugin has a history of DST bugs.
- **`@mui/x-date-pickers` 9.13.0.** Its peers accept `@mui/material` ^9 and `luxon` ^3.
- **Keep Luxon out of the guest chunk.** `RootStore` is in the initial chunk, so `ScheduleStore`
  must not be imported from it. Instead a `useScheduleStore()` hook (admin chunk) keeps one
  `ScheduleStore` per `RootStore` in a `WeakMap`. That keeps a single instance per root store —
  the property `useRootStore()`'s throwing rule protects — while Luxon and the pickers load only
  with `/admin`.
- **Model classes go in a new `src/models/` directory**, not `src/services/`. That covers
  `MarketLocation`, `RecurrencePattern`, `SessionTimeline`, and `ScheduleRow`. `src/models/` has
  the same constraint as `src/services/`: the server imports it (with `.js` extensions), so it
  stays free of MobX, React, and DOM APIs. `src/services/` keeps API clients, state-machine lookup
  maps, and genuine utilities. Existing classes in `src/services/` are not moved as a drive-by.
- **Split `netlify/services/marketSession.mts` (740 lines)** into focused modules as a
  behavior-free first commit, before changing it.

---

# Files that change

### New

- **`src/models/market-location.ts`** — `MarketLocation` class, built from `{ id, name, timeZone }`.
  - `localDateOf(instant)`
  - `instantAt(localDate, localTime)`: a nonexistent time moves forward by the gap; an ambiguous
    time takes the earlier offset.
  - `formatDate` and `formatTime` (admin English)
- **`src/models/recurrence-pattern.ts`** — `RecurrencePattern`, built from a pattern row and a
  `MarketLocation`.
  - `weekday`
  - `description` ("Every Saturday · from Sep 19, 2026")
  - `occurrenceOpensAt(localDate)`
  - `nextOccurrence(after: Date)`: the earliest occurrence whose open instant is after `after`
    (spec R11)
  - `occurrencesBetween(fromLocalDate, toLocalDate)`
  - `sessionValues(localDate)`: open and close instants, capacity, lottery delay, auto-close
- **`src/models/session-timeline.ts`** — `SessionTimeline`, built from a session row. No Luxon —
  plain `Date` arithmetic, so the guest chunk can keep using it.
  - `graceDeadline`
  - `lotteryDrawsAt`: grace deadline + delay, or null
  - `autoClosesAt`: opens + auto-close minutes, or null
  - `statusAt(now)` — was `automaticSessionStatus`
  - `acceptsSelfRegistration(now)`
  - `openingWindow(now)`, `postponedWindow(minutes)`
  - `isOverdueForAutoClose(now)`
  - `timerAt(kind)`
- **`src/models/schedule-row.ts`** — `ScheduleRow` value class: the display values for a pattern
  row or a session row, its status label (Recurring, Pending, Active), and the actions allowed.
- **Tests** next to each in `src/models/`: `market-location.test.ts`, `recurrence-pattern.test.ts`,
  `session-timeline.test.ts`, `schedule-row.test.ts`.
- **`netlify/database/migrations/20260917120000_add_admin_scheduling/migration.sql`** — see
  Migration below.
- **`netlify/services/sessionEnding.mts`**
  - `endSession(tx, event, reason: 'close' | 'auto_close' | 'reset')`: locks the row
    `FOR UPDATE`, sets `ended` only if the status is unchanged, resolves visits, and (unless the
    reason is `reset`) calls `createNextSession`.
  - `createNextSession(tx, location, now)`: if a pattern exists, inserts the next occurrence with
    `onConflictDoNothing({ target: marketEvents.locationId, where: sql\`status <> 'ended'\` })`
    and copies the pattern's questions. Returns the new row or null.
- **`netlify/services/sessionTimers.mts`** (replaces `marketLifecycleEvents.mts`)
  - `market.session-timer` event: `{ marketEventId, timer, expectedAt }`
  - `scheduleSessionTimers(event, timers[])`: sends the event with
    `delayUntil = min(expectedAt, now + 6 days)`.
- **`netlify/functions/market-session-timer.mts`** (replaces `market-registration-close.mts`)
  - The handler loads the session and does nothing if it's gone, its status doesn't fit the
    timer, or `timeline.timerAt(timer)` differs from `expectedAt`.
  - It re-arms if woken early. Otherwise:
    - `registration_close` → `getCurrentEvent()` (as today);
    - `lottery_draw` → `runLottery` plus `requestNotificationDispatch`;
    - `auto_close` → `endSession(…, 'auto_close')`.
  - `asyncWorkloadConfig.events` also lists the legacy `market.registration-close` name, so
    events queued before deploy still run.
- **`netlify/services/schedule.mts`** — the schedule payload and the pattern and session commands
  (see API). Zod schemas take local date and time strings, resolved through `MarketLocation`.
- **`netlify/services/marketLocation.mts`** — `currentLocation(tx?)`: the single location row,
  oldest first.
- **`netlify/routes/admin/schedule.mts`** — Hono routes. Mounted in
  `netlify/routes/admin/index.mts`; `withPermission('manage:sessions')` on each.
- **`netlify/test/functions/schedule.test.mts`** and `market-session-timer.test.mts`, using
  `netlify/test/dbStub.mjs` like the neighboring tests.
- **`src/services/schedule-api.ts`** — `ScheduleApi` client, same shape as `AdminApi`, with
  `requestHeaders` injected.
- **`src/stores/schedule.store.ts`** plus its test.
  - State: payload, `visibleMonth`, `selectedDate`, busy, error.
  - Computed: `location`, `pattern`, `rows: ScheduleRow[]` (pattern first), `visibleRows`
    (filtered by `selectedDate`), `pipDates` (`{ sessions: Set, projected: Set }`),
    `canAddPattern`, `canAddOneOff` plus its reason, `canCreateNextSession`.
  - Actions: load, savePattern, deletePattern, createNextSession, addOneOff, updateSession,
    deleteSession, startNow, selectDate, clearDate, setVisibleMonth. Writes after `await` go
    through `runInAction`.
- **`src/stores/react/use-schedule-store.ts`** — the `WeakMap<RootStore, ScheduleStore>` hook.
- **`src/components/schedule/`**, each file under 250 lines with a `*.stories.tsx`
  (`shell: 'admin'`):
  - `ScheduleView` — the tab; loads on mount; wraps a `LocalizationProvider` using `AdapterLuxon`.
  - `ScheduleCalendar` — `DateCalendar` with `timezone={location.timeZone}`; a custom `slots.day`
    renders a filled pip for sessions and a hollow one for projected dates; `onMonthChange` and
    `onChange` go to the store.
  - `ScheduleGrid` and `schedule-columns.tsx`
    - `DataGrid` with `disableColumnSorting`.
    - Actions are `GridActionsCellItem`s, moving into the menu (`showInMenu`) below 600px.
    - Below 600px only Date (times on a second line), Status, and Actions show.
    - The toolbar holds "Add recurring pattern" and "Add one-off session", plus the date-filter
      chip.
  - `ScheduleStatusChip`
  - `RecurrencePatternDialog`, `SessionDialog`, and `SessionTemplateFields` (the shared fields:
    open time, duration, capacity, lottery delay, auto-close). Both dialogs reuse the question
    editor extracted from `QuestionBankView` as `QuestionListEditor`.

### Modified

- **`db/schema.mts`**
  - New `marketLocations`, `recurrencePatterns`, and `recurrencePatternQuestions` tables.
  - `marketEvents` gains `locationId`, `recurrencePatternId`, `lotteryDelayMinutes`, and
    `autoCloseAfterMinutes`, and loses `sessionMode`. Its default status becomes `scheduled`.
  - A partial `uniqueIndex('market_events_one_unfinished_per_location_idx')` with `.where(...)`.
- **`src/services/sessionStateMachine.ts`**
  - Removes `SessionMode`, `draft`, `schedule_registration`, and the `mode` parameter.
  - Adds `postpone_lottery` (sources `lottery_pending`, no target).
  - `reset_session` sources drop `scheduled`.
  - The timing functions move into `SessionTimeline`; the command lookups stay as const maps.
  - `currentSessionState` keeps mapping `ended` to `inactive`.
- **`netlify/services/marketSession.mts`** — first split, with no behavior change, into:
  - `marketSession.mts`: `getCurrentEvent`, `marketOverview`, `marketHistory`;
  - `sessionCommands.mts`: open, postpone, update, close/reopen registration, `closeSession`,
    `resetSession`, `postponeLottery`;
  - `lottery.mts`: `runLottery`, `weightedShuffle`;
  - `parseSettings` and `saveSettings` are not carried over. They are deleted in layer 2, because
    they only work on `draft` sessions, which the migration removes.

  Then:
  - `getCurrentEvent` uses `SessionTimeline`. It also applies an overdue auto-close through
    `endSession`, which — like any auto-close — creates the pattern's next session. A read never
    creates a session on its own, without an ending: after a reset the location stays empty. A read
    never runs the lottery. On this path, a failure to send the new session's timers is logged to
    Sentry and swallowed, so a guest's `GET /api/market` never fails for a transition that already
    committed; the next read or staff action re-arms them.
  - `closeSession` and `resetSession` delegate to `endSession`.
  - `openRegistration` and `postponeRegistration` schedule the `registration_close` and
    `auto_close` timers.
  - Reaching `registration_closed` or `lottery_pending` schedules `lottery_draw` when a delay is
    set.
  - `updateRegistration` rejects a close time later than `autoClosesAt` (R21).
  - New `postponeLottery(event, { minutes: 1..10 })` increments `lottery_delay_minutes` and
    re-arms the draw timer.

- **`netlify/services/visitQueue.mts`** — `resolveOutstandingVisits` sets `cancelled` for
  `registered`, `waiting`, and `called`.
- **`src/services/visitStateMachine.ts`** — a doc comment: `called → cancelled` is server-applied
  when a session ends. `cancel` stays guest-only from `registered` and `waiting`.
- **`netlify/services/reports.mts`** — the lottery-odds query also counts
  `cancelled AND queue_position IS NOT NULL` as an entry that was placed. A guest placed and then
  cancelled when the session ended was still placed. No-show counts drop by design.
- **`netlify/routes/admin/market.mts`**
  - Adds `postpone_lottery` (`manage:sessions`, parameters) and removes `schedule_registration`.
  - `PUT /api/admin/market` is removed in layer 2.
- **`netlify/services/demoScenario.mts` and `scripts/fake-data.mts`**
  - Drop `sessionMode` and the `draft` stage, and set `locationId`.
  - Archiving goes through `endSession(…, 'reset')`, and a Pending session with no visits is
    deleted rather than ended.
- **`netlify/services/guestRegistration.mts`** — `acceptsSelfRegistration` via `SessionTimeline`.
- **`src/stores/market-session.store.ts`, `src/services/admin-api.ts`, `src/stores/admin.store.ts`**
  - Drop `sessionMode` and `saveSettings`.
  - Add `postpone_lottery` to `SessionCommandParameters` and `AdminStore.postponeLottery(minutes)`.
  - Add `lotteryDrawsAt` and `autoClosesAt` to the event payload.
- **`src/services/admin-views.ts`** — adds `'schedule'` after `'current-session'`, gated by
  `manage:sessions`.
- **`src/components/admin/AdminDashboardLayout.tsx`**, `src/adminLocales.ts` — the tab label and
  every new admin string. Removes `adHocSession`, `adHocSessionHelp`, `scheduleRegistration`, and
  the draft demo-stage strings.
- **`src/components/AdminDashboard.tsx`**
  - Adds the `schedule` branch, `<ScheduleView />` with no props.
  - Removes the settings and questions state, the signature effect, `saveSettings`, and
    `saveAndStartRegistration`.
  - The capacity override keeps local state keyed by the event id.
- **Session tab**
  - `SessionPhaseControls.tsx`: with no session, a card that links to the Schedule tab replaces
    `SessionSettingsForm`. `lottery_pending` shows the draw time when set, **Run Immediately**, and
    **Postpone 5 / 10 min**.
  - `SessionStepper.tsx`, `SessionView.tsx`: drop `sessionMode`.
  - `market-action-prompts.ts`: drop `schedule_registration`, add `postpone_lottery`.
  - `SessionSettingsForm.tsx`: deleted in layer 2, along with its stories and tests.
  - `QuestionBankView.tsx`: edits the pattern's questions through `useScheduleStore()` and is
    read-only with a hint when no pattern exists. It uses the extracted `QuestionListEditor`.
- **`src/components/admin/DevModeView.tsx`**, `src/services/demoScenario.ts` — no `draft` stage.
- **`src/locales.ts`** — neutral `guestView.visitStatus.cancelled.details` (the exact key path is
  confirmed while editing) in every locale.
- **Docs**
  - `docs/session-lifecycle.md`: both diagrams and their prose — no `draft` or `ad_hoc`, the
    automatic draw and auto-close, `cancelled` on ending, no next session after a reset.
  - `docs/data-model.md`: the new tables.
  - Re-stamp with `npm run check:diagrams -- --update` after checking each diagram against the
    code.
- **Existing tests and stories** that use `draft`, `sessionMode`, or `schedule_registration`,
  found by grep:
  - `sessionStateMachine.test.ts`, `session-settings.test.ts` (deleted with `session-settings.ts`
    once unused)
  - `market-session.store.test.ts`, `admin.store.test.ts`, `visit.store.test.ts`
  - `marketSession.test.mts` (split alongside its module)
  - `demo-data.test.mts`, `queue.test.mts`, `demoScenario.test.mts`, `guestRegistration.test.mts`
  - `fake-data.test.mts`, `AdminPermissions.test.tsx`, `App.test.tsx`,
    `RegistrationCountdown.test.tsx`
  - `SessionView.stories.tsx`, `AdminDashboardLayout.stories.tsx`, `DemoGuestPicker.stories.tsx`,
    `SessionBroadcastForm.stories.tsx`, `RegistrationCountdown.stories.tsx`,
    `GuestVisitStatus.stories.tsx`
  - `e2e/demo-preview.spec.ts`
- **`package.json`** — adds `luxon`, `@types/luxon`, and `@mui/x-date-pickers`.
- **`AGENTS.md`** (`CLAUDE.md` is a symlink to it) — documents `src/models/`.
  - Model classes built from state belong there.
  - It is shared with the server under the same no MobX, React, or DOM rule as `src/services/`.
  - The "Within `src/`" layout bullet, the "Business logic belongs in a class" bullet, and the
    `src/services/` shared-layer paragraph point to it.

### Migration (`…_add_admin_scheduling/migration.sql`)

1. `CREATE TABLE market_locations` (`id` uuid pk, `name`, `time_zone`, `created_at`), then
   `INSERT` The Bay Church / `America/Los_Angeles` with a fixed literal UUID.
2. `CREATE TABLE recurrence_patterns`
   - Columns: `location_id` (FK), `starts_on` date, `registration_opens_at` time,
     `registration_duration_minutes`, `capacity`, `lottery_delay_minutes` (null),
     `auto_close_after_minutes` (null), `created_at`, `updated_at`.
   - CHECKs: duration 1–1440; capacity 1–10000; delay null or 0–120; auto-close null or > 0.
   - Unique index on `location_id`.
3. `CREATE TABLE recurrence_pattern_questions` (FK `ON DELETE CASCADE`).
4. `market_events`
   - `ADD location_id`; `UPDATE … SET location_id = '<fixed uuid>' WHERE location_id IS NULL`;
     `SET NOT NULL`; add the FK.
   - `ADD recurrence_pattern_id` (FK `ON DELETE SET NULL`), `ADD lottery_delay_minutes` and
     `ADD auto_close_after_minutes`, with CHECKs.
5. `UPDATE market_events SET status = 'ended' WHERE status = 'draft'`. Recreate
   `market_events_status_check` without `draft`; `ALTER status SET DEFAULT 'scheduled'`.
6. `ALTER TABLE market_events DROP COLUMN session_mode`. Its inline CHECK goes with it.
7. `CREATE UNIQUE INDEX market_events_one_unfinished_per_location_idx ON market_events (location_id)
WHERE status <> 'ended'`.

Steps 4, 5, and 6 are data-mutating or destructive. They were signed off under spec C2, but still
need the deploy-preview dry run and a human merge.

### API (`/api/admin/schedule`, all `manage:sessions`; every write returns the full payload)

- **`GET /`**: `{ location, pattern | null (with questions), sessions }`.
  - `sessions` holds unfinished sessions only, each with its questions, `lotteryDrawsAt`, and
    `autoClosesAt`.
- **`PUT /pattern`**: create or replace the pattern.
  - If the current session is still Pending and was created from the pattern, it is deleted.
  - Then `createNextSession` runs, and the new session's timers are scheduled after commit.
- **`DELETE /pattern`**: delete the pattern's Pending session if it has no visits, then the pattern.
- **`POST /pattern/next-session`**: 409 while an unfinished session exists; otherwise
  `createNextSession`.
- **`POST /sessions`**: add a one-off session.
  - With no unfinished session, it inserts.
  - If the unfinished session is a pattern-created Pending session with no visits, that session is
    deleted first and the one-off inserted.
  - Otherwise 409. A unique violation (`23505`) also maps to 409.
- **`PATCH /sessions/:id`**: edit a Pending session — times, capacity, delay, auto-close, and
  questions. 409 once it has opened. Timers are re-armed.
- **`DELETE /sessions/:id`**: delete a Pending one-off session with no visits, then
  `createNextSession`. 409 otherwise.
- **Start Now, Run Immediately, Postpone** stay on `POST /api/admin/market`
  (`open_registration`, `run_lottery`, `postpone_lottery`).

---

# Order of work

This is a stack of dependent PRs built with gh-stack (`gh` called by absolute path). Each layer
passes `npm run checks` on its own. **Merge the whole stack before running Deploy production.**
Lower layers leave the admin temporarily unable to create sessions until the Schedule tab lands.

1. **`schedule/1-domain` — plan and domain classes (no behavior change)**
   1. Commit this plan as `intent/admin-scheduling/plan.md`.
   2. Add `luxon` and `@types/luxon`.
   3. Add `src/models/` with `MarketLocation`, `RecurrencePattern`, `SessionTimeline`, and
      `ScheduleRow`, with tests, DST cases first. Document `src/models/` in `AGENTS.md`.
   4. Move `sessionStateMachine.ts`'s timing functions into `SessionTimeline`. `sessionMode` stays
      supported here, so behavior is identical. Update the three call sites.
2. **`schedule/2-lifecycle` — migration, schema, and server lifecycle**
   1. Split `marketSession.mts` and its test — a pure move, as its own commit.
   2. Add the migration and `db/schema.mts` changes; add `marketLocation.mts`.
   3. Remove `draft`, `ad_hoc`, and `schedule_registration` across the server and shared services.
      Delete `saveSettings` and `parseSettings` (server and client), `PUT /api/admin/market`,
      `SessionSettingsForm` and its stories, and `session-settings.ts` once it's unused.
      - In `AdminDashboard`, the settings and questions state and the signature effect go. The
        capacity override keeps local state keyed by the event id.
      - The Session tab's no-session state becomes a card saying sessions are created on the
        Schedule tab; the link to it is added in layer 4.
      - `QuestionBankView` becomes read-only, showing the current session's questions, until
        layer 5.
      - **From here until layer 4, the admin cannot create sessions.** Nothing deploys to
        production mid-stack; every PR body says so.
   4. Add `sessionEnding.mts` (`endSession`, `createNextSession`) and route `close_session`,
      `reset_session`, and the demo archive through it. `resolveOutstandingVisits` resolves to
      `cancelled`; adjust the lottery-odds report.
   5. Add `postpone_lottery`, the auto-close read path, and the `update_registration` guard.
   6. Add `sessionTimers.mts` and the `market-session-timer` workload (with the legacy event name);
      delete `market-registration-close.mts` and `marketLifecycleEvents.mts`.
   7. Neutral `cancelled` guest copy in all 7 locales; `npm run check:translations`.
   8. Update demo data, tests, `docs/session-lifecycle.md`, and `docs/data-model.md`; re-stamp the
      diagrams.
3. **`schedule/3-api` — schedule service and routes**
   - `schedule.mts`, `routes/admin/schedule.mts`, handler tests.
4. **`schedule/4-tab` — the Schedule tab**
   1. Add `@mui/x-date-pickers`.
   2. Add `ScheduleApi`, `ScheduleStore` (with tests), and `useScheduleStore`; extract
      `QuestionListEditor` from `QuestionBankView` for the dialogs to reuse.
   3. Add the components and stories; add the `schedule` admin view, label, and `AdminDashboard`
      branch; add the Session tab's link to the Schedule tab.
5. **`schedule/5-rewire` — Session tab and question bank**
   1. Session tab `lottery_pending`: the draw time when set, **Run Immediately**, and
      **Postpone 5 / 10 min**.
   2. Point `QuestionBankView` at the pattern through `useScheduleStore()`.
   3. If `AdminDashboard.tsx` is still over 250 lines, split it.

---

# Risks

- **The destructive migration can fail or mutate data.**
  - `CREATE UNIQUE INDEX … WHERE status <> 'ended'` fails if more than one unfinished row exists.
    That is deliberately not "fixed" by ending rows chosen by sort order — the anti-pattern
    `docs/migrations.md` warns about.
  - Mitigation: purge before landing, the deploy-preview dry run with `npx netlify db status`, a
    human merge, and no production deploy until the stack is complete.
  - The local dev DB needs `npx netlify db migrations apply`.
- **SQL semantics aren't covered by unit tests.** `dbStub` returns queued results, so it can't
  prove partial-index conflict inference in `onConflictDoNothing`, `ON DELETE SET NULL`, the
  CHECKs, or row locking. These get verified against the local Netlify DB (Proof).
- **Races.** `close_session` pressed while the auto-close timer fires, or two one-off adds at once.
  - `endSession` locks and compares status, so only one ending wins.
  - `createNextSession` relies on `ON CONFLICT DO NOTHING`.
  - One-off adds map `23505` to 409.
- **Timers sent after commit can fail.** On staff command routes that returns a 500 after the
  state changed — the existing pattern. On the guest read path the failure is swallowed and
  reported instead.
  - Auto-close heals on the next read.
  - A lost `lottery_draw` leaves staff with Run Immediately; the draw never runs on a read.
  - The new workload also subscribes to the legacy `market.registration-close` event, so queued
    events aren't dropped.
- **The Async Workload delay limit is unverified (C6).** Timers re-arm at six days or less.
  Confirm the real limit on the deploy preview by sending a timer 8 days out and checking it
  re-arms.
- **Luxon in the guest chunk.** Importing `ScheduleStore` or `RecurrencePattern` from anything in
  the initial chunk (for example `RootStore`) would ship Luxon and the pickers to guests.
  `SessionTimeline` must stay Luxon-free. Verify with the built chunks (Proof).
- **DST resolution.** The spec picks the earlier offset for ambiguous times; Luxon's default
  choice must be pinned by tests, with an explicit offset if it differs.
- **Guest-visible semantics change.** Cancelled copy is now neutral. No-show counts in reports
  drop, and the lottery-odds report counts placed-then-cancelled guests as placed.
- **Intermediate stack states** break session creation between layers 2 and 4. That is acceptable
  only because nothing deploys to production mid-stack; this is stated in each PR body.
- **`AdminDashboard.tsx` (331 lines)** grows by one branch but loses the settings machinery. It
  should end under its current size; if not, split it in layer 5.
- **Phone layout.** DataGrid on a 375px screen. Checked in the Storybook phone viewport and the
  browser preview.

---

# Proof

- **Per layer:** `npm run checks` (lint, format, diagrams, unit tests, build) passes.
  - Layer 2: `npm run check:translations`.
  - Layers 4–5: `npm run test:storybook`.
  - Layer 5: `npm run test:e2e`, since guest flows and the demo preview are touched.
- **Unit tests (AAA)**
  - **`RecurrencePattern`**
    - next occurrence after a normal close (next week), and after an early Start Now (same week);
    - start date in the future;
    - an occurrence opening at exactly `after` (excluded);
    - `occurrencesBetween` across a month boundary.
    - DST: a Sunday pattern straddling 2026-11-01 and 2027-03-14, and a 01:30 and a 02:30 pattern
      on those dates.
  - **`SessionTimeline`**
    - draw time with and without a delay;
    - auto-close after Start Now uses the new open time;
    - `statusAt` parity with the old `automaticSessionStatus` cases, carried over;
    - `isOverdueForAutoClose`.
  - **Server**
    - `endSession` for each reason: visit resolution to `cancelled`, next session created or not;
    - `createNextSession` on conflict;
    - `postponeLottery` bounds;
    - the `update_registration` auto-close guard;
    - timer handler — stale, early (re-arm), and each timer kind;
    - the schedule routes' 409 cases and permission gating.
  - **`ScheduleStore`:** rows ordering, date filtering, pip sets, and the add and create-next
    enablement rules.
- **Local database** (`netlify dev` with migrations applied), exercised through the API and the
  running app:
  1. Create a pattern → a Pending session appears on the guest page's next-market state.
  2. Start Now → registration opens; close → lottery → Close Session → next week's session
     appears.
  3. Start Now on a future date, then close → the same week's date is recreated.
  4. Reset → no session. Create next session → it's back.
  5. Add a one-off session while Pending → it replaces Pending; delete it → the pattern's session
     returns.
  6. A plain `INSERT` of a second unfinished session against the local DB fails with `23505` —
     the only real test of the partial index and of `ON CONFLICT` inference.
  7. Delete the pattern → ended sessions keep rows, with `recurrence_pattern_id` null.
- **Browser preview.** Schedule tab at phone width and desktop: pips (filled and hollow),
  date-filter chip, pattern row first, sorting off, dialogs, and confirmation sheets. Screenshots
  are shared in the PR.
- **Bundle check.** After `npm run build`, the entry chunk and guest-route chunks contain no Luxon
  or `x-date-pickers` code, which appear only in the admin chunk. Checked by grepping the `dist/`
  entry chunk for Luxon's `IANAZone`.
- **Deploy preview (before any merge of layer 2)**
  - `npx netlify db status` shows the migration applied.
  - Exercise the flows above on the preview URL.
  - Confirm the workload delay limit (C6).
