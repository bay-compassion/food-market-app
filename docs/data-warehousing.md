# Data Warehousing (Proposal)

> **Status: proposed, not adopted.** The tables and the scheduled routine are written, but the
> routine writes nothing until someone [turns it on](#turning-it-on). Every period, threshold, and
> rule below is a recommendation for the market's leadership to accept or change. The
> [open decisions](#open-decisions) section lists what has to be settled before the first snapshot
> is taken.

## Why a Warehouse

Reports are computed live from whatever rows exist today. That has two consequences
[`guest-deletion.md`](guest-deletion.md#effect-on-reports) already names:

1. **A number sent to a funder does not stay reproducible.** Deleting a guest removes their visits,
   so last year's "people served" quietly changes.
2. **Identified records are the only record.** To keep the history, the app has to keep every
   guest's name, phone, and household details, indefinitely, which is more than the privacy policy's
   "as long as needed to operate the food market" (§6) comfortably covers.

The warehouse solves the first problem now and makes the second solvable later. It is a set of
**frozen, anonymous, aggregate** numbers in their own `warehouse` schema of the app's database,
written on a schedule and never edited. It is not a warehouse in the analytics-platform sense. There
is no per-guest data in it, no way to join back to a guest, and no query layer beyond plain SQL.

## Commitments It Must Keep

These come from existing documents and are not up for decision here:

- **The privacy policy promises "anonymized, aggregate" analysis** (§4). The warehouse holds counts,
  never rows about a person. Anything that would need a per-guest key in the warehouse needs a
  privacy policy change first, reviewed as a legal change.
- **Deletion must stay meaningful.** Because the warehouse holds no per-guest data, deleting a guest
  does not reach it and does not need to. [`guest-deletion.md`](guest-deletion.md) says so.
- **No agent touches production.** As with [`migrations.md`](migrations.md#rules-for-ai-agents) and
  `scripts/delete-guest.mts`, merging the migration, turning the routine on, and any correction to a
  snapshot are human actions.

## Recommended Stack

**A `warehouse` schema in the app's own database, written by a Netlify scheduled function.**

| Piece       | Choice                                                                                       |
| ----------- | -------------------------------------------------------------------------------------------- |
| Store       | The `warehouse` Postgres schema in the app's Netlify Database, beside the operational tables |
| Writer      | A Netlify scheduled function, `netlify/functions/warehouse-snapshot.mts`, running daily      |
| Switch      | `ENABLE_WAREHOUSE_SNAPSHOTS=true` on the production context                                  |
| Schema      | Drizzle, in `db/warehouse-schema.mts`; its migration applies on deploy like any other        |
| Readers     | Anyone who can already read the app's database: Metabase, an export, the database dashboard  |
| Aggregation | Runs inside the function. Only counts are written.                                           |

The code: [`db/warehouse-schema.mts`](../db/warehouse-schema.mts),
[`netlify/services/warehouse-snapshot.mts`](../netlify/services/warehouse-snapshot.mts), and the
counting rules as plain classes in `src/models/`: `GuestReconciliation`, `PeriodReach`,
`WarehousePeriod`, and `SnapshotSchedule`.

Why this one:

- **Nothing new to run or own.** No second database, account, credential, or vendor. Neon already
  hosts the app's database as part of Netlify's hosting (privacy policy §5), and the warehouse
  tables sit in that same database.
- **Durable without being separate.** Snapshots are append-only by convention: the routine only
  inserts, and a snapshot that already exists is skipped. They share the database's backups.
- **A schema of its own** keeps the frozen tables visibly apart from the operational ones, so a
  query, a Metabase question, or a future migration does not mistake one for the other.
- **It is still Postgres.** Metabase reads it the same way it reads the app's tables, and a grant
  writer's spreadsheet can read a CSV export of any snapshot.

What it gives up, deliberately:

- **No separate access control.** Anyone who can read the warehouse can also read guest records,
  because it is the same database. Keeping reporting data durable matters here; siloing who can read
  it does not.
- **Shared blast radius.** A migration or a database restore affects the warehouse too. Restoring to
  an earlier point loses snapshots taken after it. The next runs write them again, but from the data
  as it stands then, which may have had guests deleted since. Migrations touching the `warehouse`
  schema deserve the same scrutiny as a `DELETE`.

Alternatives considered:

| Option                   | Why not (for now)                                                            |
| ------------------------ | ---------------------------------------------------------------------------- |
| A separate Neon project  | A new account and credential to own, for access control that is not the goal |
| A second Netlify project | A second site to keep deploying, holding an owner credential to its database |
| Netlify Blobs JSON       | No SQL. Every question becomes a script.                                     |
| Parquet on S3/R2         | A new processor and a new account to own, for very little volume.            |
| BigQuery / MotherDuck    | Built for volumes this market will never have, and both are new processors.  |

## What Goes In

Each run writes a **snapshot**: one row describing what was captured, plus the fact rows for it.

| Table                | One row per             | Holds                                                                   |
| -------------------- | ----------------------- | ----------------------------------------------------------------------- |
| `snapshots`          | Snapshot                | Kind, period, when taken, code version, the snapshot it supersedes      |
| `session_facts`      | Session                 | Date, location, capacity, sign-ups, served, no-shows, not placed, wait  |
| `period_reach`       | Period                  | Sessions, visits served, unique people, unique households, first visits |
| `period_composition` | Period, category, value | People served by age band, household size, and language                 |
| `period_lottery`     | Period, lottery weight  | Entries and placements                                                  |

**Periods.** Unique-people and composition counts cannot be added across months: someone who came in
March and April is one person in the quarter, not two. Because the warehouse has no guest key, every
period a funder might ask for has to be counted when it closes. The proposal is month, calendar
quarter, calendar year, and the market's fiscal year ([open decision](#open-decisions)). A period
that was never snapshotted cannot be reconstructed after its guests are deleted.

**Household composition comes from `visits`, not `guests`.** The household size and age range on the
most recent visit in the period describe the household for that period, as they do on the live
Reports screen. The old `guests` columns stopped being written when that data moved to `visits` (see
[`data-model.md`](data-model.md)).

### What Never Goes In

Names, phone numbers (normalized or not), guest or visit ids, device and access credential hashes,
staff notes, pronunciations, free-text registration answers, notification wording, and staff names
from `visit_events.actor_name`. Scale-question answers could be warehoused later as a distribution
per question, but that is a separate decision.

## Counting One Person Once

Unique counts are only as good as the guest table's idea of who is the same person, and the same
person can appear as more than one guest row. A worker may add someone at the desk who also
registers themselves from their phone, or a guest who cleared their browser registers again on the
same number. `visits.normalized_phone` keeps the number each visit was made with, so a phone that
later changed on the guest record still links. (A guest who moves to a new number and registers
fresh cannot be linked by phone at all.)

The proposed rule, for the routine to apply at snapshot time:

- **Households:** guest rows that share a normalized phone, from the guest record or any of their
  visits, are one household.
- **People:** within a household, guest rows whose normalized first and last names match are one
  person. A household that shares a phone (a parent and an adult child) stays two people.

Where the resulting person and household ids live is an [open decision](#open-decisions):

- **In memory only (proposed to start).** The routine computes clusters for one run and discards
  them. Nothing new is stored anywhere, but the rule is re-applied from scratch each time.
- **Persisted in the live database.** A `person_id` and `household_id` on `guests`, kept current as
  guests register, would let the live reports, the guest database, and the warehouse all count the
  same way, and would let a worker merge two records by hand. It is still never copied to the
  warehouse.

Either way the rules belong in one server-side domain class, so the live reports can adopt the same
definitions. Until they do, **warehoused unique counts will be slightly lower than the live Reports
screen** for the same period. Any funder-facing number should cite the warehouse.

Duplicates are not rare. Every visit a worker adds creates a new guest record, and that visit's
`is_first_visit` flag is always set, so the flag overcounts first visits. The warehouse counts a
person as first-time when the earliest served visit across all their reconciled records falls in the
period.

The device credential (`guests.device_token_hash`) does not help here. It is unique per guest row,
so it confirms a returning browser is the same row but cannot link two rows to each other.

## Schedule and Procedure

The function runs once a day and is idempotent: each run writes only what is due and not yet
captured.

1. **A session is due** once it has ended and the settling window has passed. Workers can still
   record a visit after a session ends, so snapshotting the moment it ends would freeze an
   incomplete number. Proposed window: seven days.
2. **A period is due** once it has ended and the same window has passed.
3. Each due item is read from the operational tables, then written in one transaction. A failure
   writes nothing for that item, and the next day's run tries again. Inserting a snapshot that
   already exists does nothing, so overlapping or repeated runs are harmless.
4. A run writes at most 25 snapshots. The first runs after launch are therefore the backfill: every
   settled session and period since the market's first session, oldest first, a batch a day.
5. The run logs what it wrote (`warehouse.snapshot`, with kind and period, never counts about a
   person), and a failure reaches Sentry like any other function error.

**Corrections.** A snapshot is never changed. If one is wrong (a session was recorded late, or a
counting bug is fixed), a human writes a new snapshot with the next revision number, pointing at the
one it supersedes. (The schema supports this; the script for it is not written yet.) Readers take
the latest snapshot for a period by default, and a funder report cites the snapshot id it was drawn
from, so it stays reproducible either way.

**The backfill will not match numbers already sent.** The warehouse reconciles unique counts and the
live Reports screen does not. Until October 2026 the live screen also read household size and age
range from the `guests` columns, which have been null for guests created since August 2026, so
household-member counts and the "Who was served" breakdown reported in that window undercounted. A
backfilled snapshot of an earlier period will disagree with whatever was sent at the time. That is
expected, and a funder report should cite which source it came from.

**Small numbers.** A month in which one guest spoke Tigrinya identifies that guest to anyone who was
there. The warehouse keeps exact counts. Anything published outside the market suppresses cells
below a threshold ([open decision](#open-decisions)).

## Retiring Identified Records (Later Phase)

Once a period is safely warehoused, the live database no longer needs identified records for it in
order to report on it. That makes it possible to adopt a rule such as "a guest with no visit in N
months is de-identified": name, phone, notes, and answers are blanked, and the counts already live
in the warehouse. This proposal does **not** set N or build the step. It needs its own policy
decision, its own human-run script with a dry run and a confirmation (the shape of
`delete-guest.mts`), and a check that nothing operational still needs the record. A returning guest
is recognized by their device credential (`device_token_hash`), not their phone, so
de-identification must keep that hash. Otherwise a returning guest would register as a new record,
and that visit would count as a first visit.

## Access

The warehouse is readable by whoever can read the app's database. Nothing is added to the roles in
[`roles.md`](roles.md). The Metabase reader in [`metabase.md`](metabase.md) is granted the `public`
schema only, so reading snapshots there takes one more grant, run the same way:

```sql
GRANT USAGE ON SCHEMA warehouse TO metabase_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA warehouse TO metabase_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA warehouse GRANT SELECT ON TABLES TO metabase_reader;
```

## Open Decisions

| Decision                                 | Proposed default                                        |
| ---------------------------------------- | ------------------------------------------------------- |
| Fiscal year start                        | Ask the treasurer. Needed before the first year closes. |
| Settling window before a snapshot        | Seven days after a session or period ends               |
| Small-cell suppression threshold         | Suppress counts below 5 in anything published           |
| Reconciliation rule for "same person"    | Shared phone and matching first and last name           |
| Where reconciled ids live                | In memory per run. Persist on `guests` later if wanted. |
| Backfill of periods before the warehouse | Every settled period since the first session, 25 a day  |
| Retirement period for identified records | Not proposed. A separate decision.                      |

## Turning It On

**These steps are a human's job.** Per [`migrations.md`](migrations.md#rules-for-ai-agents), an AI
agent must not merge the migration, run SQL against production, or set production variables.

1. **Merge the pull request.** The `warehouse` schema's migration applies on the next production
   build, like every other. It is additive: a new schema and five new tables, nothing changed.
2. **Check two things** the routine cannot undo once it has written:
   - **Demo data.** Never turn snapshots on in a deploy that has `ENABLE_DEMO_DATA_TOOLS` on.
     Period counts skip guests marked `fake`, but session and lottery figures come from the live
     reports, which do not.
   - **Placeholder phones.** Linking records by phone is transitive, so a number typed for guests
     who have none, such as the church's, would merge them all into one household. Count normalized
     phones shared by more than a few distinct names, and fix or exclude them first:

     ```sql
     SELECT normalized_phone, count(DISTINCT lower(first_name || ' ' || last_name)) AS names
     FROM guests GROUP BY normalized_phone
     HAVING count(DISTINCT lower(first_name || ' ' || last_name)) > 3
     ORDER BY names DESC;
     ```

3. **Turn it on.** In the Netlify UI, set `ENABLE_WAREHOUSE_SNAPSHOTS` to `true`, scoped to
   Functions, for the **production** context only. Scheduled functions run only on the published
   production deploy, so deploy previews never write snapshots.
4. **Watch the first runs.** Each run logs `warehouse.run` with how many snapshots it wrote and how
   many remain, 25 a day until the backfill reaches the present.

A schema change edits `db/warehouse-schema.mts` and adds a hand-written migration under
`netlify/database/migrations/`, reviewed and merged by a human like any other.

**Limits of this first version.** It assumes one market location, and fails loudly if there is a
second. Periods are calendar months, quarters, and years only. Fiscal years wait on that decision.

## Phases

1. **Agree on this document.** Settle the open decisions above.
2. **Turn it on** as above. The routine is already written and tested.
3. **Adopt.** Once the backfill has caught up, funder reports cite warehouse snapshots.
4. **Retire identified records**, if and when a retention period is adopted.
