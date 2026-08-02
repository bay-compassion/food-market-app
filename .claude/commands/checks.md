---
description: Run every pre-merge check (lint, format, tests, build) and give a plain pass/fail summary
allowed-tools: Bash
---

This runs `scripts/checks.js` — a plain Node script, not something Claude-specific, so any agent
or a human can run the exact same thing via `npm run checks`. This command is just a shortcut for
it in Claude Code.

Output of `npm run checks`:

!`npm run checks`

Summarize the result for the user in plain language. If it failed, do not silently work around
it — don't delete or loosen a failing test, don't disable a lint rule, and don't change a check's
configuration to make it pass. Explain what failed and either fix the underlying problem or, if
the cause isn't clear, say so and ask before changing anything.
