<!-- diagram-sources: db/schema.mts=e02861386e3a -->

# Database structure

A map of every table this app stores data in, and how they relate. The tables are defined in
[`../db/schema.mts`](../db/schema.mts); the migrations that created them are in
`netlify/database/migrations/` (see [`migrations.md`](migrations.md)).

The diagram is written in [Mermaid](https://mermaid.js.org/), a plain-text diagram format GitHub
renders automatically when viewing this file on github.com. It is maintained by hand — see
[keeping the diagrams honest](#keeping-the-diagrams-honest) at the bottom.

Companion diagrams: [`session-lifecycle.md`](session-lifecycle.md) for the states a market session
moves through, and [`user-journey.md`](user-journey.md) for the path a guest takes through the app.

```mermaid
erDiagram
    market_events ||--o{ registration_questions : "asks"
    market_events ||--o{ visits : "hosts"
    guests ||--o{ visits : "attends"
    visits ||--o| push_subscriptions : "notifies"
    visits ||--o| sms_subscriptions : "notifies"
    visits ||--o{ notification_deliveries : "queues"
    guests ||..o| guest_pin_attempts : "matched by normalized_phone (no foreign key)"

    market_events {
        uuid id PK
        timestamptz registration_opens_at
        timestamptz registration_closes_at
        integer capacity
        text session_mode "scheduled | ad_hoc"
        text status "see session-lifecycle.md"
        timestamptz created_at
    }

    registration_questions {
        uuid id PK
        uuid market_event_id FK "cascade delete"
        text prompt
        text type "text | scale"
        boolean required
        integer position
    }

    guests {
        uuid id PK
        text first_name
        text last_name
        integer age "nullable; superseded by age_range, dropped in a later migration"
        text phone
        text normalized_phone
		text device_token_hash UK "nullable; authenticates self-service sign-ups from one browser"
		text pin_hash "retired credential; retained pending a later cleanup migration"
        text locale
        timestamptz created_at
    }

    visits {
        uuid id PK
        uuid market_event_id FK
        uuid guest_id FK
        text status "see session-lifecycle.md"
        integer queue_position "lottery order; walk-ins placed on arrival"
        integer lottery_weight "relative odds in the draw; 1 unless a worker raised them"
        text age_range "nullable; 0-17 | 18-29 | ... | 75+, entered at this visit"
        integer household_size "entered at this visit"
        integer children_count "shopping for, entered at this visit"
        integer seniors_count "55+, shopping for, entered at this visit"
		text normalized_phone "nullable snapshot for later reconciliation"
        timestamptz called_at
        timestamptz served_at "null when never served, or recorded after the session ended"
        jsonb answers "registration question answers"
        text source "self | admin"
        text access_token_hash UK
        date visit_date
        boolean is_first_visit
        timestamptz created_at
    }

    push_subscriptions {
        uuid id PK
        uuid visit_id FK "unique; cascade delete"
        text endpoint UK
        text p256dh
        text auth
        timestamptz created_at
        timestamptz updated_at
    }

    notification_deliveries {
        uuid id PK
        uuid visit_id FK "cascade delete"
        text type "called | registration_closed | lottery_selected | ..."
        text dedupe_key "unique per visit and channel"
        text channel "push | sms"
        text title
        text body
        text status "pending | sent | failed"
        integer attempts
        text last_error
        timestamptz created_at
        timestamptz sent_at
    }

    sms_subscriptions {
        uuid id PK
        uuid visit_id FK "unique; cascade delete"
        timestamptz consented_at
        timestamptz created_at
    }

    guest_pin_attempts {
        text normalized_phone PK
        integer failure_count
        timestamptz window_started_at
        timestamptz locked_until
    }
```

A few things the diagram can't show on its own:

- **A `visit` is one guest at one market session.** It's the row that carries everything about that
  appearance — queue position, status, household composition, the answers given at registration —
  while `guests` holds only the long-lived identity reused across sessions: name, phone, and the
  device credential. Household composition (age range, household size, children/seniors counts)
  is entered fresh at each visit rather than carried on the guest, and the browser keeps its own
  last-entered copy in `localStorage` purely to prefill the next visit's form.
- **`guests` still has `age_range`, `household_size`, `children_count`, and `seniors_count`
  columns in the database that this diagram omits.** Application code stopped reading and writing
  them once household composition moved to `visits` — they're mid backfill-then-drop, waiting on a
  later migration to actually remove them (see
  [`migrations.md`](migrations.md#the-backfill-then-drop-rule)).
- **`called_at` and `served_at` are the only timing this database keeps.** There is no log of
  status changes, so anything time-based in reporting is measured from those two columns. Both are
  null for a visit a worker recorded after its session had already ended — that guest was handed
  food outside the app, and stamping a time would be inventing one.
- **The device token is the self-service guest credential.** The opaque token exists only in the
  browser; the database stores its hash in `device_token_hash`. Existing rows and guests added by
  an admin have no device credential. The retired `pin_hash` and `guest_pin_attempts` data remain
  only so removing them can happen in a separately reviewed, destructive migration.
- **`visits.normalized_phone` preserves the submitted phone number in normalized form.** Renewed
  information can update the long-lived guest profile without erasing the phone signal that was
  present on an earlier visit, so later analysis can reconcile possible duplicate guest records.
- **Only `market_events → registration_questions` and the two `visits →` tables cascade on delete.**
  `visits` itself has plain references, so a guest or market event with visits can't simply be
  deleted.

## Keeping the diagrams honest

Each diagram document starts with a `diagram-sources` comment listing the files it was drawn from
and a fingerprint of each. `npm run check:diagrams` recomputes those fingerprints and fails when one
has changed, so a schema edit can't quietly leave this page describing a database that no longer
exists. After reviewing (and fixing, if needed) the diagram, run
`npm run check:diagrams -- --update` to record that it was checked. `npm run checks` runs this
alongside the other pre-merge checks.
