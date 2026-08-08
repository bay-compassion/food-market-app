# Bay Compassion contributor guide

## Product priorities

- This is primarily a mobile app. Design and implement for the mobile experience first; desktop responsiveness is not a requirement unless a task explicitly asks for it.
- Prefer clear, conventional, and small implementations. This project is maintained largely by novice developers working with agentic coding tools, so optimize for readability and low maintenance cost over clever abstractions or new dependencies.
- Make the smallest change that fully solves the request. "Smallest" refers to behavior and blast radius, not to the number of files: splitting an oversized file into focused pieces is not scope creep, and neither is extracting a component you had to read in full in order to edit safely. Reuse the existing Vue, TypeScript, and project patterns before introducing a new pattern or library.

## Localization

- All user-facing text must be localized: labels, headings, buttons, validation and error messages, empty states, success messages, placeholders, and accessibility text.
- When adding or changing user-facing text, add or update its translation for **every** language listed in `src/locales.ts` in the same change.
- Use the translation system in `src/locales.ts`; do not leave hard-coded fallback text in components. Keep the `Translation` interface and every locale dictionary in sync.
- Preserve culturally appropriate scripts and writing direction for translated content. Do not translate proper names such as `The Bay Compassion` unless the product direction explicitly calls for it.
- After touching either locale file, run `npm run check:translations` (`scripts/check-translations.js`). TypeScript already guarantees every language has every key; this instead flags values still identical to English — a likely missed translation. It's advisory, not a hard gate: review each flagged value rather than assuming it's wrong.

## Code and verification

- Use TypeScript and Vue's existing conventions.
- Keep components small and single-purpose. A `.vue` file should do one recognizable job — one screen, one card, one form, one row. Treat roughly 250 lines as the point at which a component should be split _before_ anything more is added to it, and treat the second copy of a piece of markup as the signal to extract it rather than duplicate it. Splitting an existing oversized component while you are working in it is expected, not optional.
- Compose components with a container that owns state and children that take props and emit events. Data fetching and shared state stay in the container; children stay presentational. Do not add a state-management library for this.
- "Avoid premature generalization" means don't invent abstractions for cases that don't exist yet. It does not mean leaving duplicated markup in place, and it does not mean keeping a component large — extracting something that already has two call sites is not premature.
- Whenever practical, implement business logic in separate services rather than alongside presentation code.
- Follow the repository formatter: tabs, single quotes, semicolons, and a 100-character print width. Run `npm run format` after edits when needed.
- The Vue app lives in `src/`; static assets live in `public/`; database schema code is in `db/`; and Netlify functions are in `netlify/functions/`.
- Netlify deploys every file in `netlify/functions/` as a function, and function names may only contain alphanumeric characters, hyphens, or underscores. Keep tests for those handlers in `netlify/test/functions/`; a colocated `name.test.ts` fails the deploy. Tests elsewhere, including `netlify/lib/` and `netlify/services/`, stay colocated.
- Within `src/`: shared components sit directly in `src/components/`, and components belonging to one feature go in a subfolder named for it (for example `src/components/admin/`). Frontend business logic goes in `src/services/`. CSS shared across components — anything a scoped `<style>` block cannot reach, since scoped styles do not apply inside child components — belongs in `src/styles/` and is imported once from `src/main.ts`.
- This is currently a Netlify-targeted application. Keep deployment configuration and server-side work compatible with the Netlify setup in `netlify.toml` and `netlify/`.
- Before creating or editing anything under `netlify/database/migrations/`, read `docs/migrations.md` and complete its pre-merge checklist. Migrations apply automatically to production on the next build — never merge or deploy a migration yourself; a human must review and merge it.
- TypeScript configuration is split by environment: `tsconfig.app.json`, `tsconfig.node.json`, and `tsconfig.vitest.json` are referenced from `tsconfig.json`.
- `oxlint` uses type-aware checks; treat warnings as worth resolving when they affect changed code.
- The Mermaid diagrams in `docs/data-model.md`, `docs/session-lifecycle.md`, and `docs/user-journey.md` are maintained by hand and fingerprint the source files they describe. `npm run check:diagrams` fails when one of those files changed; update the affected diagram if the change made it wrong, then run `npm run check:diagrams -- --update` to re-stamp. Re-stamping without looking at the diagram defeats the check.
- The project uses Node 24 (see `.nvmrc`).
- Before handing off a change, run the relevant checks. For web-app changes, prefer:

  ```bash
  npm run lint
  npm run format:check
  npm run check:diagrams
  npm run test:unit -- --run
  npm run build
  ```

  Or run all five at once with `npm run checks` (`scripts/checks.js`), which prints a clear
  pass/fail summary for each one. This is a plain script, not a Claude-specific command — it works
  the same for any agent, in CI, or run by hand.

- Do not modify unrelated files or overwrite existing user changes.
