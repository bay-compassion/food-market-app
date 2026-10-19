# Deleting a Guest's Data

The [privacy policy](../src/components/legal/privacy.md) promises that a guest can ask us to
delete their information. An admin answers that from the dashboard: the guest database's Actions
menu has **Delete Guest Permanently**, which removes the guest and every row stored about them in
one transaction. It needs `delete:guest-data`, which only the `data-steward` role holds — see
[`roles.md`](roles.md#deleting-a-guest-permanently).

## 1. Verify the Request

The policy says we confirm the guest's identity before acting, because guest records have no
login. Before deleting anything:

1. Call or text the phone number on file — not a number the request came from, if they differ.
2. Confirm their name and roughly when they last came to a market.
3. Keep a short note of the request: date received, who verified it, who deleted the record, and
   when. Do not write the guest's name or phone number in it.

## 2. Delete Them in the Dashboard

1. Open **Guest Database** and search for the guest. A household can share a phone, so check the
   name as well as the number.
2. Open the guest's Actions menu (the dots at the end of the row) and choose **Delete Guest
   Permanently**.
3. Check the name and sign-up date the dialog shows, then type the guest's phone number. The
   **Delete Permanently** button stays disabled until the number matches, and the server checks it
   again.

A guest with a visit in a session that has not ended cannot be deleted yet; the dialog says so.
Finish the session first. The deletion cannot be undone except by restoring the whole database
from a backup.

The dashboard logs each deletion as `guest.deleted`, with the guest's id and the admin's Auth0
subject. That line is the only record that it happened, since the guest's visit history goes with
them; Netlify keeps function logs only briefly, so keep your own note from step 1.

## If the Dashboard Is Unavailable

`npm run guest:delete` ([`scripts/delete-guest.mts`](../scripts/delete-guest.mts)) runs the same
deletion from a terminal. **It is a human's job:** per [`migrations.md`](migrations.md), an AI
agent must never run anything against the production database, and that includes this script.

It needs a connection string for the production database with permission to delete rows. Copy it
from the Neon console (the project owner has access), or run
`npx netlify env:get NETLIFY_DB_URL --context production`. Either is a live credential to every
guest's data: set it for these commands only and never save it to `.env` or a file.

```bash
NETLIFY_DB_URL='<connection string>' npm run guest:delete -- --phone="925-555-0100"
```

This lists every guest with that number and changes nothing. Copy the right guest's id.

```bash
NETLIFY_DB_URL='<connection string>' npm run guest:delete -- --guest-id=<id>
```

This shows the guest and how many rows each table holds about them, and still changes nothing.
Check that the first line names the database host you expect.

```bash
NETLIFY_DB_URL='<connection string>' npm run guest:delete -- --guest-id=<id> --confirm="925-555-0100"
```

This deletes them. `--confirm` takes the guest's phone number, the same check the dashboard makes.
The script does not write the `guest.deleted` log line, so the note from step 1 is the record.

## What It Deletes

| Table                     | What it held                                                  |
| ------------------------- | ------------------------------------------------------------- |
| `guests`                  | Name, phone, language, pronunciation, staff notes             |
| `visits`                  | Every visit: household counts, age range, question answers    |
| `visit_events`            | Each visit's history of status changes                        |
| `notification_deliveries` | Text and push messages sent about a visit, with their wording |
| `push_subscriptions`      | Browser push subscriptions                                    |
| `sms_subscriptions`       | Text-message consent                                          |
| `sms_opt_outs`            | Replies of STOP                                               |
| `guest_claims`            | Any unredeemed code for moving the record to another phone    |

Deleting the opt-out record does not restart texts: the guest's text consent is deleted with it,
and Twilio itself keeps blocking a number that replied STOP.

## What It Does Not Reach

- **The `warehouse` schema.** Its snapshots are counts with no guest id, name, or phone, so there
  is nothing about the guest in them to delete. See [`data-warehousing.md`](data-warehousing.md).
- **Database backups.** Neon's point-in-time recovery keeps earlier copies until its retention
  window passes (see the backups TODO in [`migrations.md`](migrations.md)).
- **Netlify Blobs.** A name tag waiting at the print station and the cached market overview expire
  on their own within the day.
- **Sentry.** Error reports and replays are kept for 30 days, then deleted.
- **Twilio.** Its message logs keep the phone number and message text; delete them in the Twilio
  console if the request covers them.
- **Copies outside the app.** Exported CSVs, a local Metabase, paper sign-in sheets. Ask whoever
  holds them to delete the guest's rows.

## Effect on Reports

Reports are computed from the visits that remain, so deleting a guest changes past numbers:
served counts, unique guests, and the "Who was served" breakdown for every period they attended.
A report already sent to a funder will no longer reproduce exactly from the live screen. Once
warehouse snapshots are being taken, cite those instead, because a deletion does not change them.
The other way to keep live numbers stable is to anonymize the guest instead of deleting them —
blank their name, phone, notes and answers while keeping the visit counts — which the app does not
do yet.
