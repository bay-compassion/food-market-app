---
description: Look for locale entries that were likely never translated (identical to the English text)
allowed-tools: Bash
---

This runs `scripts/check-translations.js` — a plain Node script, not something Claude-specific, so
any agent or a human can run the exact same thing via `npm run check:translations`. This command
is just a shortcut for it in Claude Code.

Output of `npm run check:translations`:

!`npm run check:translations`

Explain the findings (if any) to the user in plain language, grouped by language. Remind them that
a match isn't automatically wrong — proper names (like "The Bay Compassion", which should not be
translated per `AGENTS.md`) and short values can legitimately repeat across languages — but
anything else that matches is worth a second look. Do not edit either locale file yourself unless
asked; this command only reports findings.
