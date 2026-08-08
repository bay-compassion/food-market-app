<!-- diagram-sources: db/schema.ts=eb711a98a39c -->

# Database structure

A map of every table this app stores data in, and how they relate. The tables are defined in
[`db/schema.ts`](../db/schema.ts); the migrations that created them are in
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
        integer age
        integer household_size
        text phone
        text normalized_phone
        text pin_hash "null until a PIN is set"
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
        timestamptz called_at
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
        text dedupe_key "unique per visit"
        text title
        text body
        text status "pending | sent | failed"
        integer attempts
        text last_error
        timestamptz created_at
        timestamptz sent_at
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
  appearance — queue position, status, the answers given at registration — while `guests` holds only
  the long-lived person record reused across sessions.
- **`guest_pin_attempts` has no foreign key to `guests`.** It's keyed by phone number so failed PIN
  attempts can be rate-limited even when the phone number doesn't match any guest — which is exactly
  the case worth throttling.
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
