# Metabase (optional ad hoc analytics)

[Metabase](https://www.metabase.com/) is a third-party dashboarding tool: point it at a database
and it gives you charts, dashboards, and a query builder, without writing SQL by hand. It is
**optional tooling for exploring the data**, not part of the deployed app — Netlify does not build
or run anything for it, and nothing in `src/` or `netlify/` depends on it existing.

Use it when the [predefined reports](reporting.md) don't answer a question — a one-off chart for a
grant application, a dashboard someone wants to keep an eye on over time, slicing the data a way
the catalogue in `src/services/reports.ts` doesn't cover. If you find yourself building the same
Metabase question repeatedly, that's a sign it belongs in the reports catalogue instead, where it's
version-controlled, translated, and covered by tests.

There are two ways to run it. Pick one — they don't need to coexist.

|               | Docker Compose                               | Metabase Cloud                              |
| ------------- | -------------------------------------------- | ------------------------------------------- |
| Where it runs | A machine you (or the market) control        | Metabase's own hosting                      |
| Cost          | Free (the software); you provide the machine | Paid subscription                           |
| Setup effort  | Install Docker, run one command              | Sign up, no infrastructure                  |
| Good for      | Trying it out locally, a volunteer's laptop  | Something the whole team can reach reliably |

Both connect to the **same underlying database** (Netlify DB, backed by Neon Postgres — see
[`concepts.md`](concepts.md)) the same way, covered once in [Connecting a database](#connecting-a-database-either-form)
below.

## Read this before connecting anything

Metabase gets **direct SQL access** to whatever database you connect it to. This app's database
holds the same guest names, phone numbers, and ages as the "Export every visit" download described
in [`reporting.md`](reporting.md#the-two-downloads) — a Metabase question can select that data just
as easily as a chart of session totals. Treat "who has a Metabase login" with the same weight as
"who has `export:guest-data`" in [`roles.md`](roles.md), regardless of whether Metabase itself sits
behind Auth0.

Two things reduce that risk and are worth doing before connecting either form to real data:

1. **Connect with a dedicated, read-only database role — never the app's own credentials.** The
   app's `NETLIFY_DB_URL` connection can create, alter, and delete rows; Metabase only needs to
   read. See [Create a read-only role](#create-a-read-only-role) below.
2. **Limit who can log in to Metabase** to the people who'd already qualify for `export:guest-data`
   in Auth0 (see [`roles.md`](roles.md)). Metabase Cloud and self-hosted Metabase both manage their
   own separate user accounts — nothing here inherits Auth0's roles automatically.

## Docker Compose

Files live in [`metabase/`](../metabase/): a `docker-compose.yml` running Metabase alongside a
small Postgres container for Metabase's _own_ app data (dashboards, saved questions, Metabase user
accounts) — not the guest data, which is added afterwards as a connection from inside Metabase.

1. Install Docker Desktop (or Docker Engine + the Compose plugin).
2. `cp metabase/.env.example metabase/.env` and set a real `METABASE_DB_PASSWORD`. This only
   protects Metabase's own app database; don't commit `metabase/.env` (it's already covered by the
   repo's `.gitignore` `.env` pattern).
3. `npm run metabase:up` starts it in the background. First start pulls the Metabase image, so it
   can take a minute.
4. Open <http://localhost:3000> and complete Metabase's setup wizard — this creates your Metabase
   admin account, separate from Auth0 and from `metabase-db`'s password.
5. Add the app's database as described in [Connecting a database](#connecting-a-database-either-form).
6. `npm run metabase:down` stops it; your dashboards and questions persist in a Docker volume
   between restarts. To also delete that volume (wipes all Metabase questions/dashboards, not the
   app's data), run `docker compose -f metabase/docker-compose.yml down -v`.

This is meant for one machine at a time (a volunteer's laptop, a market office computer). If you
want something reachable by the whole team without someone keeping a machine running, use Metabase
Cloud instead — or, if the machine does stay running, see below.

### Sharing it with the team (optional)

If the Docker Compose machine stays on (e.g. a market office computer) and you want others to
reach it without port-forwarding or a static IP, `metabase/docker-compose.yml` includes an
optional `cloudflared` service that exposes Metabase at a public https URL via a
[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/).
It's off by default — only the two services above start with `npm run metabase:up`.

1. In the Cloudflare Zero Trust dashboard, go to **Networks → Tunnels → Create a tunnel**, and
   point it at `http://metabase:3000`. Copy the token shown in the install step.
2. Set `CLOUDFLARE_TUNNEL_TOKEN` in `metabase/.env` to that token (see `metabase/.env.example`).
3. Start it with the `tunnel` profile:
   `docker compose -f metabase/docker-compose.yml --profile tunnel up -d`. `npm run metabase:down`
   still stops everything, tunnel included.

Anyone with the tunnel's URL can reach your Metabase login — so this doesn't replace limiting who
can log in to Metabase, described in [the section above](#read-this-before-connecting-anything).

## Metabase Cloud

1. Sign up at <https://www.metabase.com/cloud> and create an instance. There's no Docker, server,
   or deploy step — Metabase hosts it.
2. Sign in and add the app's database the same way as [below](#connecting-a-database-either-form).
3. Metabase Cloud reaches the database over the public internet, so the connection must use SSL —
   Neon requires it regardless (`sslmode=require`), and Metabase's PostgreSQL connection form has a
   "Use a secure connection (SSL)" toggle that should be on.
4. If the Neon project has an IP allow list configured (**Neon console → Project → Settings →
   IP Allow**), add Metabase Cloud's IP ranges, or ask the project owner to — otherwise Metabase
   Cloud won't be able to reach it even with correct credentials.

## Connecting a database (either form)

### Create a read-only role

Run this once against the database you're connecting to, replacing the password. It creates a
role that can `SELECT` from every existing and future table but nothing else:

```sql
CREATE ROLE metabase_reader LOGIN PASSWORD 'set-a-real-password-here';
GRANT CONNECT ON DATABASE neondb TO metabase_reader;
GRANT USAGE ON SCHEMA public TO metabase_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO metabase_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO metabase_reader;
```

(`neondb` is Neon's usual default database name — check the connection string you're working from
if the project uses a different one.)

**Where you run this depends on which database you mean, and this is the one step in this guide
that isn't optional to get right:**

- **Local dev database:** `npx netlify db connect -q "<the SQL above>"` is safe — per
  [`migrations.md`](migrations.md), this command only touches your local database unless you point
  it at a remote branch, and this doesn't.
- **Production database:** per [`migrations.md`](migrations.md), **never run `netlify db connect`
  against production.** Run the SQL above from the **Neon console's SQL editor** instead (the
  project owner has access — see the `migrations.md` TODO on backups for who that is), and treat
  doing so as a human, deliberate action, not something an AI agent should run for you.

### Add the connection in Metabase

**Settings → Admin settings → Databases → Add a database → PostgreSQL**, then fill in the fields
from the connection string for whichever database you created the role against:

- **Host, port, database name** — the middle parts of the connection string
  (`postgresql://user:password@HOST:PORT/DATABASE?...`).
- **Username / password** — `metabase_reader` and the password you set above, **not** the app's own
  credentials.
- **SSL** — on. Neon requires it.

To find the app's own connection string for reference (host/port/database only — don't reuse its
credentials): `npx netlify env:get NETLIFY_DB_URL --context dev` for local, or
`--context production` for production. The production form of that command returns a live
credential with full read/write access to guest data — treat it the same as any other secret in
[`concepts.md`](concepts.md#secrets--and-why-the-caution-is-worth-the-inconvenience), and prefer
getting connection details for the read-only role from whoever ran the `CREATE ROLE` step instead
of pulling the app's own URL at all.
