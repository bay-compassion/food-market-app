# Reporting

The **Reports** screen in the admin area answers the questions that get asked after a session is
over: how it went, how many people the market reached this quarter, and whether the lottery is
behaving. It is the one admin screen designed for a desk rather than a phone.

Reports are read-only. Nothing on this screen changes a session, a guest, or a visit.

## How a report is put together

Three pieces, deliberately kept apart:

- [`src/services/reports.ts`](../src/services/reports.ts) — the catalogue. Which reports exist,
  what columns each returns, and how each column should be rendered. Shared by the browser and the
  server so the two cannot disagree about a report's shape.
- [`netlify/services/reports.mts`](../netlify/services/reports.mts) — the SQL, one function per
  report. The server returns **data only**: no column headings, no formatted numbers.
- [`src/components/admin/ReportsView.tsx`](../src/components/admin/ReportsView.tsx) and its two
  children — the screen. Headings come from `adminLocales.ts` and numbers are formatted in the
  reader's locale, which is why the server never sends text.

Adding a report means adding an entry to the catalogue, a query beside the others, and its name,
description, and any new column labels to **every** language in `adminLocales.ts`. TypeScript will
not compile until all seven are filled in.

## What each report counts

Every report is bounded by the **session's registration opening time**, so a date range means
"sessions held in this window" — the way a grant period is written. A guest who registered at
11pm for a session the next morning counts in the session's period, not their own.

| Report                   | One row per        | Counts                                                                                                        |
| ------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------- |
| Session summary          | Session            | Sign-ups, served, no-shows, not placed, workers' additions, and how full the session ran against its capacity |
| People served by month   | Month              | Sessions held, visits served, unique guests, household members, and first visits                              |
| Who was served           | Category and value | Age band, household size, and language of everyone served                                                     |
| Lottery outcomes by odds | Lottery weight     | Entries, how many were placed, and the placement rate                                                         |
| Service timing           | Session            | Visits served, median and longest wait, and how many carry no timing                                          |

Definitions worth being precise about, because grant reports usually are:

- **Served** always means a visit that reached the `served` status. A guest who was called but
  never marked served is not counted, and neither is one still waiting.
- **Unique guests** and **household members** in the monthly report are **unduplicated within the
  month**. Someone who comes to three sessions in March is one guest and one household there, while
  the `served` column still counts all three visits. Household size is taken from the guest record,
  so it reflects what they last told us, not what was true at each visit.
- **Who was served** counts each guest once for the whole period, however many sessions they
  attended.
- **Lottery outcomes** only includes visits that were self-registered and actually went through a
  draw. A guest a worker placed straight into the line never entered the lottery, so counting them
  would report a placement rate the draw had nothing to do with. Visits still `registered` are
  excluded too — their session has not drawn yet.
- **Wait time** is `served_at` minus `called_at`. The **No timing** column is the honest
  counterweight: visits served before `served_at` existed, and visits a worker recorded by hand
  after a session ended, carry no timestamps at all. A median drawn from the rest would otherwise
  look like it covered everyone. See [`data-model.md`](data-model.md) for why those rows are null
  rather than backfilled.

## The two downloads

**Download CSV** under a report saves exactly the table on screen — translated headings, raw
numbers and dates so a spreadsheet reads them as numbers and dates rather than text.

**Export every visit** is the escape hatch: one row per guest per session, flattened across all
three tables, with the database's own column names as headings. Anything the predefined reports
do not answer can be answered from this in a spreadsheet, which is why there is no query builder
in the app.

That export **contains guest names and phone numbers**. It is a separate, deliberate action for
that reason, and the screen says so above the button. The reports themselves count people without
identifying them, and are safe to share as-is.

Both files start with a byte-order mark so Excel reads them as UTF-8 — without it, every guest
name that is not plain ASCII is mangled, and this app registers guests in seven languages.

## Who can see reports

Reading a report needs `read:reports`; the visit export needs `export:guest-data`. Both belong to
the `admin` role, so a volunteer who can run the queue cannot open either. See
[`roles.md`](roles.md) for the full picture, including how to give someone report access without
giving them guest names.
