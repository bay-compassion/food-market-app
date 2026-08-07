# Why this project has tests

## What a test actually is

A test is a small script that runs part of the app and checks the result against what's expected
— for example, "if someone submits a check-in with an invalid PIN, the server should reject it,"
or "an admin action should require login." Every file ending in `.test.ts` in this repo is a
collection of checks like that. Running `npm run test:unit -- --run` runs all of them and reports
which passed and which failed.

## Why this matters more, not less, when you're not the one writing the code

If you were reading and reviewing every line an AI agent wrote, you could catch a mistake by eye.
Once you're relying on an agent to write and change code on your behalf, that safety net is gone —
you're trusting the agent's own claim that its change works. Tests replace that missing review
step with something objective: a change either makes the existing tests pass or it doesn't, and
that's true regardless of how confident the agent sounds in its summary.

Concretely, tests in this repo protect things you'd have no easy way to verify by eye:

- **Who's allowed to do what.** `netlify/lib/auth.test.ts` and the handler tests (e.g.
  `netlify/functions/guests.test.ts`) pin down exactly which actions require an admin login and
  which don't — for instance, that a guest can register for a market without logging in, but only
  an authenticated admin can change a guest's status. If an agent's change accidentally removed a
  login check, or added one where it shouldn't be, a test would fail immediately instead of that
  gap shipping to production unnoticed.
- **Business rules that are easy to get subtly wrong.** `src/services/sessionStateMachine.test.ts`
  and `netlify/services/marketSession.test.ts` check the rules for when a market session can move
  between states (draft, open, closed, etc.) — rules that are simple to state but easy to break
  with a one-line change that looks harmless.
- **Known limitations, on purpose.** A few tests exist specifically to record a known gap rather
  than fix it — for example, one in `netlify/functions/push-subscription.test.ts` documents that
  an ended session's access token can still manage push subscriptions. That's intentional: it
  means a future change (by you or an agent) that alters this behavior will show up as a
  deliberate, visible test change instead of a silent side effect.

## What to do with a failing test

A failing test is useful information, not an obstacle to work around. If an agent's change makes
a test fail, the right response is almost always "the change broke something — ask the agent to
fix it or explain why," not "delete or edit the test so it passes." Treat instructions to skip,
disable, or loosen a test with the same suspicion you'd give an instruction to skip the login
check — sometimes it's legitimate (the old behavior really was wrong), but it should be a
deliberate decision you make, not something that happens quietly as a side effect of getting a
change to go green.

## How to run them

```bash
npm run test:unit -- --run
```

This is also one of the four checks listed in [`AGENTS.md`](../AGENTS.md) that should pass before
any change is considered finished — an agent following that file's instructions should already be
running it, but it costs nothing to run it yourself and see the same pass/fail summary.

You can also run all four in one go with **`npm run checks`** (`scripts/checks.js`), which prints a
clear pass/fail summary instead of you having to run and interpret each command yourself. It's a
plain script, not tied to any particular AI tool — it works the same whether you type it yourself,
Codex runs it, or Claude Code does. If you're working with Claude Code specifically, typing
**`/checks`** does the same thing as a slash-command shortcut.
