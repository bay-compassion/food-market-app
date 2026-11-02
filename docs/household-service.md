# Recording count-only households served

During service, use **Record household served** on the queue desk or Today screen. For a closed
session, choose the same action from its History menu. Enter the household size (including the
shopper), from 1 to 30, then record it. The form clears for the next household and shows session
count-only totals. It does not create a guest, queue place, notification, or print job.

Record completed shopping only. If a household already has a visit, mark that visit served instead
of entering it here: anonymous entries cannot automatically detect an identified duplicate.

Use **Correct size** for a mistaken count, **Undo entry** to remove an accidental entry from
service totals, and **Restore entry** to reverse an undo. Rows remain stored, including their
creator, latest correcting worker, timestamps, and correction version. Concurrent corrections are
refused rather than overwriting another worker; refresh before retrying.

If a save cannot be confirmed, use **Retry this save**. The recorder holds the original operation
ID and household size, and saves them in tab session storage when available, so navigating back
or reloading the tab can recover an uncertain operation. It will not submit another household
until the pending save is confirmed. With browser storage unavailable, retry protection lasts
while the recorder remains mounted. Do not start a replacement entry on another device.

Session Summary and People Served by Month include count-only households in households served,
and sum household sizes in **People served (with repeats)**. Both show separate count-only
household and person totals. Unique guests and monthly unique household members cover identified
visits only. Count-only entries are excluded from demographics and timing reports and the
identified visit export. Use report CSV downloads for the combined totals.

## Migration review

`20261102030000_add_household_service_entries/migration.sql` is additive:

1. `CREATE TABLE` adds anonymous service records, with a session foreign key, a household-size
   check, creator/latest-editor fields, timestamps, an undo timestamp, and a correction version.
2. `CREATE INDEX` adds a session lookup index.

It does not change existing tables or rewrite/delete existing data. A human must review and merge
this migration. Before merging, verify application of the migration and exercise recording,
correction, undo, and combined report totals on the Netlify deploy preview, as described in
[migration safety](migrations.md). No production deployment or remote database query is needed to
prepare this change.

## Follow-on backlog

1. [Phase 1 — count-only recording](https://github.com/bay-compassion/food-market-app/issues/302).
2. [Phase 2 — standby](https://github.com/bay-compassion/food-market-app/issues/51), depends on Phase 1.
3. [Phase 3 — QR entry](https://github.com/bay-compassion/food-market-app/issues/303), depends on Phase 2.
4. [Phase 4 — shared iPads](https://github.com/bay-compassion/food-market-app/issues/304), depends on Phase 3.
