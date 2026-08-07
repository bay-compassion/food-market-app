# Database migration safety

## Merging is deploying — for the database too

There is no separate "apply the migration" step in this project. `npm run build` doesn't run
migrations, `package.json` has no `db:migrate` script, and `drizzle.config.ts` only _generates_
SQL files into `netlify/database/migrations/` — it never applies them. Migrations are applied
automatically by Netlify's own build system the moment a build runs for a site connected to
Netlify DB, using whatever SQL files exist under `netlify/database/migrations/` at that commit.

That means:

- A normal merge to `main` that reaches a production build, or running **Actions → Deploy
  production → Run workflow** (see the [Deployment](../README.md#deployment) section of the
  README), is enough to run that SQL — including `DROP COLUMN` or `DROP TABLE` — directly against
  the **production** database. There is no manual approval, dry-run, or diff-review step anywhere
  in this repository's own tooling.
- `.github/workflows/ci.yml` runs lint, format-check, and unit tests on every push, but it never
  runs `npm run build` and never touches a database. A broken or destructive migration file is
  **not** caught by CI before merge.

Treat every migration file the same way you'd treat a production `DELETE` statement: something
that ships the moment it merges, not something reviewed separately later.

## Risk categories

Not every migration carries the same risk. Judge each new migration file against these three
categories:

**Destructive schema change** — drops a column or table, permanently discarding whatever data was
in it. Example already in this codebase,
[`netlify/database/migrations/20260718150000_model_registrations_as_visits/migration.sql`](../netlify/database/migrations/20260718150000_model_registrations_as_visits/migration.sql):
it first backfills `visits` from `guests` (an `UPDATE ... FROM` plus an `INSERT ... SELECT` for
any guest not yet represented in `visits`), and only _after_ that backfill does it run

```sql
ALTER TABLE "guests" DROP COLUMN "market_event_id";
ALTER TABLE "guests" DROP COLUMN "status";
ALTER TABLE "guests" DROP COLUMN "answers";
ALTER TABLE "guests" DROP COLUMN "source";
```

This is the right shape for a destructive migration — copy the data somewhere else first, verify
it, and only then drop the original. See the backfill-then-drop rule below for how to apply this
going forward.

**Data-mutating, but no `DROP`** — looks "safe" because nothing is deleted from the schema, but it
rewrites existing rows based on an assumption that might not hold. Example already in this
codebase,
[`netlify/database/migrations/20260718120000_add_session_lifecycle/migration.sql`](../netlify/database/migrations/20260718120000_add_session_lifecycle/migration.sql)
lines 3-8:

```sql
WITH "newest_event" AS (
	SELECT "id" FROM "market_events" ORDER BY "created_at" DESC LIMIT 1
)
UPDATE "market_events"
SET "status" = 'ended'
WHERE "id" NOT IN (SELECT "id" FROM "newest_event");
```

This marks every market event _except the newest one_ as `ended`, identifying "the newest one" by
sort order rather than an explicit ID. If two events ever share a timestamp, or the intent was
actually a specific event, this silently mislabels data with no error and no obvious symptom.
A migration doesn't need a `DROP` in it to be dangerous — any `UPDATE` or `DELETE` that selects
rows by something other than an explicit, unambiguous key deserves the same scrutiny as a drop.

**Safe / additive** — a nullable `ADD COLUMN`, a new `CREATE INDEX`, a new table with no
backfill required. Still worth a quick read, but not the category that needs a human pause before
merging.

## The backfill-then-drop rule

Never ship a backfill and the corresponding `DROP` in the same migration/deploy unless you have
verified on a deploy preview (see below) that the backfill covers every row. Prefer splitting the
work into two separate deploys:

1. Add the new column/table, backfill it, and (if applicable) start writing to both the old and
   new location. Merge and confirm in production that the backfill is complete and correct.
2. Only in a later, separate PR, drop the old column/table.

The one destructive migration in this repo today did the backfill and the drop in a single file.
That's an acceptable pattern for a small, well-understood table at the time, but it's not one to
repeat by default — the two-deploy split gives you a chance to catch a bad backfill before the
old data is gone.

## Deploy preview as the dry run

Every pull request against this repo gets a Netlify deploy preview, and non-production Netlify
build contexts (deploy previews and branch deploys) connect to an **isolated database branch**,
not the production database. This is a real, already-available dry run — use it before merging
any migration that isn't purely additive:

1. Open the PR containing the new migration file.
2. Wait for the Netlify deploy preview to finish building.
3. Run `npx netlify db status` (optionally with `--branch` for a specific preview branch) to
   confirm the migration applied cleanly.
4. Exercise the screens affected by the schema change on the preview URL.
5. Only merge once the preview build and manual check both look right.

## Pre-merge checklist

Before merging any change under `netlify/database/migrations/`, confirm:

- [ ] Does the SQL contain `DROP COLUMN`, `DROP TABLE`, `DROP CONSTRAINT`, `TRUNCATE`, or an
      `UPDATE`/`DELETE` with no `WHERE` clause (or a `WHERE` that isn't an explicit ID/key)?
      If yes, treat this as a **destructive schema change** or **data-mutating** migration above
      and get explicit sign-off from the project owner before merging — don't merge it solo, and
      don't have an agent merge it.
- [ ] If it's destructive, is the drop in a separate, later deploy from its backfill (see the
      backfill-then-drop rule)?
- [ ] Did you open a PR, let the deploy preview build, and confirm with `npx netlify db status`
      that the migration applied there without error?
- [ ] Did you manually exercise the affected screens on the preview URL?
- [ ] Is a **human** — not an AI agent — the one clicking merge?

## Local commands and their footguns

These are run via `npx netlify db ...` (Netlify CLI) and only ever touch your **local** dev
database or a specific remote branch you name — never production, unless you explicitly point one
at it:

- `netlify db status` — shows applied/pending migrations.
- `netlify db migrations new` — scaffolds a new migration file.
- `netlify db migrations apply` — applies pending migrations to your **local** dev database only.
- `netlify db migrations pull --branch <name>` — overwrites your local migration files with a
  remote branch's migrations.
- `netlify db migrations reset` — deletes local **unapplied** migration files. This loses
  uncommitted migration work, not data.
- `netlify db reset` — wipes your local dev database (all data and tables), **with no confirmation
  prompt**. It cannot reach production, but it will happily destroy your local data instantly if
  typed out of habit.
- `netlify db connect [-q <sql>]` — opens a raw SQL connection, and can be pointed at a remote
  branch. **Never run `netlify db connect` against production.** There's nothing in this repo that
  stops a raw `DROP TABLE` typed into that connection from running immediately.

## Backups and recovery

> **TODO (project owner — fill in before handoff):** Netlify DB is backed by Neon
> (`@neondatabase/serverless` in `package-lock.json`), which supports point-in-time recovery at
> the infrastructure level, but nothing in this repository documents how to use it for this
> project specifically. Before handing this project off, please fill in:
>
> - Who owns the Netlify account and the Neon account/project for this site?
> - What is the Neon project console URL?
> - What is the point-in-time recovery retention window on the current plan?
> - What is the exact restore procedure, and who is authorized to run it?
> - Who should the incoming maintainer contact in an emergency, and for how long is that
>   contact available after handoff?

## Rules for AI agents

- You may write and generate migration files.
- You must never merge a pull request containing a migration, and you must never trigger a
  production deploy yourself.
- You must never run `netlify db connect`, `netlify db reset`, or any raw SQL against a remote
  database branch.
- Before a human merges a migration you wrote, give them a plain-English, statement-by-statement
  summary of what it does, and explicitly call out if any statement matches the "destructive" or
  "data-mutating" risk categories above.
