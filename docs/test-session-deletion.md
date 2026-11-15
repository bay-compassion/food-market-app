# Deleting a Test Session

Sometimes a session is run only to check how the app behaves: a rehearsal, a new printer, a change
to the draw. Its sign-ups, servings and timings should never reach the reports or the warehouse. A
data steward deletes it from the dashboard once it ends. This is meant to be rare, and it is never
a way to correct a real market day: a real session's numbers stay, even when they are wrong.

It needs `delete:guest-data`, the same permission that deletes a guest, because deleting a session
deletes guest data with it. See [`roles.md`](roles.md#deleting-a-guest-permanently).

## Before the Test

- **Use test guests, not real people.** Register with your own phone or a team member's, and give
  names that are obviously tests (`Tess Tester`). The dialog lists every guest record it will
  delete by name, so a real guest who registered by mistake is easy to spot.
- **Delete it within seven days of ending, if you can.** The [warehouse](data-warehousing.md)
  freezes a session's numbers once it has been over for seven days. Deleted before then, the test
  never reaches the warehouse at all. Deleted after, it has to be forced (see below).

## Delete It in the Dashboard

1. End the session. A session that has not ended cannot be deleted: deleting visits out of a live
   queue or an undrawn lottery would leave both inconsistent.
2. Open **Session History**, find the session, and open its menu (the dots at the end of the row).
   Choose **Delete Test Session**.
3. Check the date and time, the counts, and the names of the guests who will be deleted with it.
4. Type the session's date and start time exactly as the field's hint shows them
   (`2026-11-14 09:30`, a 24-hour clock in the market's time zone), and choose
   **Delete Permanently**. The server checks them again. The time is what tells apart two sessions
   on the same day, such as a morning test run before that afternoon's market.

The deletion cannot be undone except by restoring the whole database from a backup. The dashboard
logs it as `session.deleted`, with the session's id, the steward's Auth0 subject, and how many rows
went from each table. That line is the only record that it happened.

## If the Warehouse Has Already Counted It

Once a snapshot covers the session, the dialog lists every one: the session's own summary, and the
month, quarter and year it fell in. It offers the rest only after you tick
**Also remove these warehouse snapshots**. The deletion then removes those snapshots, with their
numbers, in the same transaction as the session.

- **The next daily run takes them again.** Each removed period that still has another session in
  it is owed again, and the routine writes it from the data as it then stands, without the test.
  A period whose only session was the test, such as the month of a pre-launch rehearsal, is no
  longer owed at all and stays empty. The session's own summary is never taken again.
- **A report that cited a removed snapshot will not match the warehouse.** Its snapshot id is
  gone, and the period's new snapshot has a new id. Check that nobody has sent a removed period's
  numbers to a funder before forcing it.
- **Do it away from the routine's daily run.** If the run starts while the deletion is in progress,
  it may write the test session's summary again from numbers it read just before. Afterwards,
  check that no `session` snapshot remains at the test session's opening time.
- **The log is the only record.** `session.deleted` records `forced: true` and the id and kind of
  every snapshot removed.

## What It Deletes

All of it in one transaction:

| What                                 | Rows                                                                 |
| ------------------------------------ | -------------------------------------------------------------------- |
| The session                          | `market_events`, its `registration_questions`, session-scoped odds   |
| Every visit in it                    | `visits`, with their `visit_events`, notifications and push sign-ups |
| Count-only households recorded in it | `household_service_entries`                                          |
| Guests who came only to this session | `guests`, and everything that cascades from them (see below)         |

A guest who came only to the test session is deleted the same way
[Delete Guest Permanently](guest-deletion.md#what-it-deletes) deletes one: their text consent,
opt-outs, phone-transfer codes and odds changes go with them.

A guest who also came to another session keeps their record and loses only the test visit. If the
test was marked as their first visit, their earliest remaining visit becomes their first, as long
as it falls on or after the test session's date. A visit from before the test is never rewritten,
so a period already reported keeps its first-visit count.

## What It Does Not Reach

The same places a guest deletion does not reach: database backups, Sentry, Twilio's message logs,
and any copies outside the app. See [`guest-deletion.md`](guest-deletion.md#what-it-does-not-reach).
Texts already sent to test phones stay sent.

A recurring pattern does not recreate a deleted session. It schedules its next session from the
current date, not from the sessions before it.
