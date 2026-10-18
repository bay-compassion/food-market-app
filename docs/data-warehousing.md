# Data Warehousing (Proposal)

> **Status: proposed, not adopted.** The scheduled routine is written but does nothing until a
> human [sets the warehouse up](#setting-it-up). Every period, threshold, and rule below is a
> recommendation for the market's leadership to accept or change. The
> [open decisions](#open-decisions) section lists what has to be settled before the first snapshot
> is taken.

## Why a Warehouse

Reports are computed live from whatever rows exist today. That has two consequences
[`guest-deletion.md`](guest-deletion.md#effect-on-reports) already names:

1. **A number sent to a funder does not stay reproducible.** Deleting a guest removes their visits,
   so last year's "people served" quietly changes.
2. **Identified records are the only record.** To keep the history, the app has to keep every
   guest's name, phone, and household details, indefinitely, which is more than the privacy
   policy's "as long as needed to operate the food market" (§6) comfortably covers.

The warehouse solves the first problem now and makes the second solvable later. It is a separate
store of **frozen, anonymous, aggregate** numbers, written on a schedule and never edited. It is not
a warehouse in the analytics-platform sense. There is no per-guest data in it, no way to join
back to a guest, and no query layer beyond plain SQL.

## Commitments It Must Keep

These come from existing documents and are not up for decision here:

- **The privacy policy promises "anonymized, aggregate" analysis** (§4). The warehouse holds counts,
  never rows about a person. Anything that would need a per-guest key in the warehouse needs a
  privacy policy change first, reviewed as a legal change.
- **Deletion must stay meaningful.** Because the warehouse holds no per-guest data, deleting a guest
  does not reach it and does not need to. Once the warehouse is set up, `guest-deletion.md` should list
  it under "What It Does Not Reach" with that reason, and its "Effect on Reports" section should
  point funders at warehoused snapshots.
- **No agent touches production.** As with [`migrations.md`](migrations.md#rules-for-ai-agents) and
  `scripts/delete-guest.mts`, creating the warehouse database, its roles, and any correction to a
  snapshot are human actions. The scheduled routine is code an agent may write. A human deploys it
  and sets its credential.

## Recommended Stack

**A second Neon project, written by a Netlify scheduled function.**

| Piece       | Choice                                                                                  |
| ----------- | --------------------------------------------------------------------------------------- |
| Store       | A separate Neon Postgres **project** (not a branch of the app's database)               |
| Writer      | A Netlify scheduled function, `netlify/functions/warehouse-snapshot.mts`, running daily |
| Credential  | `WAREHOUSE_DB_URL`, a role with `INSERT` and `SELECT` only on the warehouse tables      |
| Schema      | Drizzle, in `db/warehouse-schema.mts`, with migrations applied by hand, never on deploy |
| Readers     | A `SELECT`-only role for Metabase or a spreadsheet, as in [`metabase.md`](metabase.md)  |
| Aggregation | Runs against the live database inside the function. Only the results leave it.          |

The code: [`db/warehouse-schema.mts`](../db/warehouse-schema.mts) and its migrations in
[`db/warehouse-migrations/`](../db/warehouse-migrations/),
[`netlify/services/warehouse-snapshot.mts`](../netlify/services/warehouse-snapshot.mts), and the
counting rules as plain classes in `src/models/`: `GuestReconciliation`, `PeriodReach`,
`WarehousePeriod`, and `SnapshotSchedule`.

Why this one:

- **No new data processor.** Neon is already named in the privacy policy (§5) as the database host.
  Every alternative that adds a vendor (BigQuery, S3 or R2 Parquet files, Google Sheets) adds a name
  guests have to be told about, for data that fits comfortably in a few megabytes a year.
- **A project, not a branch.** A Neon branch of the production database starts as a copy of it,
  which means every guest's name and phone. A separate project starts empty and never holds them.
- **Append-only by permission, not by convention.** The writer's role cannot `UPDATE` or
  `DELETE`, so a bug in the routine cannot rewrite a number already sent to a funder.
- **It is still Postgres.** Metabase connects the same way it does today, and a grant writer's
  spreadsheet can read a CSV export of any snapshot.

Alternatives considered:

| Option                | Why not (for now)                                                                      |
| --------------------- | -------------------------------------------------------------------------------------- |
| Tables in the live DB | Shares the app's credentials, backups, and blast radius. A migration could rewrite it. |
| Netlify Blobs JSON    | No new vendor, but no SQL. Every question becomes a script.                            |
| Parquet on S3/R2      | A new processor and a new account to own, for very little volume.                      |
| BigQuery / MotherDuck | Built for volumes this market will never have, and both are new processors.            |

## What Goes In

Each run writes a **snapshot**: one row describing what was captured, plus the fact rows for it.

| Table                | One row per             | Holds                                                                   |
| -------------------- | ----------------------- | ----------------------------------------------------------------------- |
| `snapshots`          | Snapshot                | Kind, period, when taken, code version, the snapshot it supersedes      |
| `session_facts`      | Session                 | Date, location, capacity, sign-ups, served, no-shows, not placed, wait  |
| `period_reach`       | Period                  | Sessions, visits served, unique people, unique households, first visits |
| `period_composition` | Period, category, value | People served by age band, household size, and language                 |
| `period_lottery`     | Period, lottery weight  | Entries and placements                                                  |

**Periods.** Unique-people and composition counts cannot be added across months: someone who came
in March and April is one person in the quarter, not two. Because the warehouse has no guest key, every
period a funder might ask for has to be counted when it closes. The proposal is month, calendar
quarter, calendar year, and the market's fiscal year ([open decision](#open-decisions)). A period
that was never snapshotted cannot be reconstructed after its guests are deleted.

**Household composition comes from `visits`, not `guests`.** The household size and age range on
the most recent visit in the period describe the household for that period, as they do on the live
Reports screen. The old `guests` columns stopped being written when that data moved to `visits` (see
[`data-model.md`](data-model.md)).

### What Never Goes In

Names, phone numbers (normalized or not), guest or visit ids, device and access credential hashes,
staff notes, pronunciations, free-text registration answers, notification wording, and staff names
from `visit_events.actor_name`. Scale-question answers could be warehoused later as a distribution per
question, but that is a separate decision.

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
person as first-time when the earliest served visit across all their reconciled records falls in
the period.

The device credential (`guests.device_token_hash`) does not help here. It is unique per guest row,
so it confirms a returning browser is the same row but cannot link two rows to each other.

## Schedule and Procedure

The function runs once a day and is idempotent: each run writes only what is due and not yet
captured.

1. **A session is due** once it has ended and the settling window has passed. Workers can still
   record a visit after a session ends, so snapshotting the moment it ends would freeze an
   incomplete number. Proposed window: seven days.
2. **A period is due** once it has ended and the same window has passed.
3. Each due item is read from the live database, then written to the warehouse in one transaction.
   A failure writes nothing for that item, and the next day's run tries again. Inserting a snapshot
   that already exists does nothing, so overlapping or repeated runs are harmless.
4. A run writes at most 25 snapshots. The first runs after launch are therefore the backfill: every
   settled session and period since the market's first session, oldest first, a batch a day.
5. The run logs what it wrote (`warehouse.snapshot`, with kind and period, never counts about a
   person), and a failure reaches Sentry like any other function error.

**Corrections.** A snapshot is never changed. If one is wrong (a session was recorded late, or a
counting bug is fixed), a human writes a new snapshot with the next revision number, pointing at
the one it supersedes. (The schema supports this; the script for it is not written yet.) Readers take the latest snapshot for a period by default, and a funder report
cites the snapshot id it was drawn from, so it stays reproducible either way.

**The backfill will not match numbers already sent.** The warehouse reconciles unique counts and
the live Reports screen does not. Until October 2026 the live screen also read household size and
age range from the `guests` columns, which have been null for guests created since August 2026, so
household-member counts and the "Who was served" breakdown reported in that window undercounted. A
backfilled snapshot of an earlier period will disagree with whatever was sent at the time. That is
expected, and a funder report should cite which source it came from.

**Small numbers.** A month in which one guest spoke Tigrinya identifies that guest to anyone who
was there. The warehouse keeps exact counts, readable only by people who already hold
`read:reports`. Anything published outside the market suppresses cells below a threshold
([open decision](#open-decisions)).

## Retiring Identified Records (Later Phase)

Once a period is safely warehoused, the live database no longer needs identified records for it in
order to report on it. That makes it possible to adopt a rule such as "a guest with no visit in N
months is de-identified": name, phone, notes, and answers are blanked, and the counts already live in
the warehouse. This proposal does **not** set N or build the step. It needs its own policy decision,
its own human-run script with a dry run and a confirmation (the shape of `delete-guest.mts`), and a
check that nothing operational still needs the record. A returning guest is recognized by their
device credential (`device_token_hash`), not their phone, and a visit is flagged as a first visit when
no guest matches it. De-identification must therefore keep that hash, or every returning guest would be
counted as new. Guests added by a worker have no device credential, so this protection does not
cover them.

## Access

| Who                              | Can                                                   |
| -------------------------------- | ----------------------------------------------------- |
| The scheduled function           | Insert new snapshots, read existing ones              |
| People with `read:reports`       | Read every snapshot, through Metabase or an export    |
| The Neon project owner           | Create roles, apply warehouse migrations, re-snapshot |
| Anyone else, including AI agents | Nothing against the live warehouse                    |

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
| Who owns the Neon warehouse project      | The same owner as the app's Neon project                |

## Setting It Up

**These steps are a human's job.** Per [`migrations.md`](migrations.md#rules-for-ai-agents), an AI
agent must not create databases, run SQL against them, or set production secrets.

1. In the Neon console, create a **new project** for the warehouse. Do not branch the app's project.
2. In the new project's SQL editor, run each `migration.sql` under `db/warehouse-migrations/`, oldest
   first.
3. Create the writer and reader roles:

   ```sql
   CREATE ROLE warehouse_writer LOGIN PASSWORD 'set-a-real-password-here';
   GRANT USAGE ON SCHEMA public TO warehouse_writer;
   GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA public TO warehouse_writer;

   CREATE ROLE warehouse_reader LOGIN PASSWORD 'set-a-different-password';
   GRANT USAGE ON SCHEMA public TO warehouse_reader;
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO warehouse_reader;
   ```

   Repeat the `GRANT … ON ALL TABLES` lines after applying any later warehouse migration.

4. Set `WAREHOUSE_DB_URL` to the `warehouse_writer` connection string, for the production context
   only, in the Netlify UI. Deploy previews and local development should not have it.
5. Before setting the variable, check two things the routine cannot undo once it has written:
   - **Demo data.** Never set `WAREHOUSE_DB_URL` in a deploy that has `ENABLE_DEMO_DATA_TOOLS` on.
     Period counts skip guests marked `fake`, but session and lottery figures come from the live
     reports, which do not.
   - **Placeholder phones.** Linking records by phone is transitive, so a number typed for guests
     who have none, such as the church's, would merge them all into one household. In the app's
     database, count normalized phones shared by more than a few distinct names, and fix or
     exclude them first.
6. The next daily run starts the backfill. Each run logs `warehouse.run` with how many snapshots it
   wrote and how many remain.

A schema change follows the same path: edit `db/warehouse-schema.mts`, run
`npx drizzle-kit generate --config drizzle.warehouse.config.ts`, review the SQL, and have a human
apply it before deploying code that depends on it.

**Limits of this first version.** It assumes one market location, and fails loudly if there is a
second. Periods are calendar months, quarters, and years only. Fiscal years wait on that decision.

## Phases

1. **Agree on this document.** Settle the open decisions above.
2. **Set it up** as above. The routine is already written and tested.
3. **Adopt.** Once the backfill has caught up, funder reports cite warehouse snapshots.
4. **Retire identified records**, if and when a retention period is adopted.
