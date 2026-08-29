# Bay Compassion contributor guide

## Product priorities

- This is primarily a mobile app. Design and implement for the mobile experience first; desktop responsiveness is not a requirement unless a task explicitly asks for it.
- Write expert-level code: use the abstractions, tooling, modularity, and dependencies a senior engineer would reach for when they are the right tool for the job. This project is maintained largely through agentic coding tools rather than read and hand-edited line-by-line by novice contributors, so simplifying implementations for a beginner reader is a false economy — optimize for correctness, maintainability, and idiomatic use of the ecosystem instead.
- Make the smallest change that fully solves the request. "Smallest" refers to behavior and blast radius, not to the number of files: splitting an oversized file into focused pieces is not scope creep, and neither is extracting a component you had to read in full in order to edit safely. Reuse the existing Vue, TypeScript, and project patterns before introducing a new pattern or library.

## Storybook

- `npm run storybook` opens the component workshop on port 6006. Use it to build and review a component on its own — it is the practical way to see states that are hard to reach in the running app, such as every visit status on `GuestVisitStatus`.
- Storybook configuration lives in `.storybook/`. Stories sit next to the component they cover (`src/components/AppButton.stories.ts`); the design system documentation pages are Storybook-only content and live in `.storybook/docs/` rather than in `src/`.
- A story must declare which page shell it renders inside, with `parameters: { shell: 'guest' | 'admin' | 'bare' }`. This is not cosmetic: every rule in `admin.css` is prefixed `.admin-dashboard`, so an admin component rendered without its shell is unstyled. A guest component has no equivalent shared stylesheet; the `guest` shell instead supplies the `.guest-layout` container's width and padding, matching the real page.
- Any story whose args include `locale` has that arg driven by the toolbar's locale picker, and re-renders with `dir="rtl"` for Arabic and Farsi. Prefer taking `locale` as an arg and deriving `t` from it over hard-coding a translation, and match text in a `play` function against the entry in `locales.ts` rather than a literal string.
- Design tokens live in `src/styles/base.css` and the design system pages read their values from it live. Change a token there, never in a documentation page.
- Storybook's MDX documentation layer is React internally, but nothing in this repo is. The color, radius, and type specimens are Vue components (`.storybook/docs/TokenTable.vue`, `TypeScale.vue`) exposed as stories in `DesignTokens.stories.ts` and pulled into the MDX prose with `<Story of={...} />`. Those stories are tagged `!dev` so they stay out of the sidebar while still being covered by `npm run test:storybook`. Add a specimen the same way rather than writing JSX in an MDX file.
- `npm run test:storybook` renders every story in headless Chromium and runs its `play` function. It needs `npx playwright install chromium` once. It is kept out of `npm run checks` on purpose so a fresh clone does not need browser binaries — run it when you have changed a component or a story.

## End-to-end tests

- `npm run test:e2e` runs Playwright specs from `e2e/` against `npm run dev`, driving a real browser through the running app. Like `npm run test:storybook`, it needs `npx playwright install chromium` once and is kept out of `npm run checks` on purpose so a fresh clone does not need browser binaries.
- These specs run against the Vite dev server only — no Netlify Functions, database, or Auth0 — so they're limited to guest-facing behavior that works without a backend. See `e2e/README.md` for what that covers and why.
- `playwright.config.ts` emulates a phone by default, matching this app's mobile-first priority.

## Localization

- All user-facing text must be localized: labels, headings, buttons, validation and error messages, empty states, success messages, placeholders, and accessibility text.
- Text related to the admin dashboard does not need to be localized.
- When adding or changing user-facing text, add or update its translation for **every** language listed in `src/locales.ts` in the same change.
- Use the translation system in `src/locales.ts`; do not leave hard-coded fallback text in components. Keep the `Translation` interface and every locale dictionary in sync.
- `Translation` is being migrated incrementally from one flat set of keys into nested groups per feature area, e.g. `guestView: GuestViewTranslations` for components under `src/components/guest-view/`. When adding or touching translations for a feature area, put them under that area's nested `<Area>Translations` group (named after its `src/components/<area>/` folder) instead of adding another flat top-level key. Convert an existing flat cluster into a nested group opportunistically when you're already working in that area — don't do it as a drive-by unrelated change. `src/adminLocales.ts` predates this convention and is a separate top-level dictionary, not a nested group inside `Translation`; leave that split as-is.
- Preserve culturally appropriate scripts and writing direction for translated content. Do not translate proper names such as `The Bay Compassion` unless the product direction explicitly calls for it.
- After touching either locale file, run `npm run check:translations` (`scripts/check-translations.js`). TypeScript already guarantees every language has every key; this instead flags values still identical to English — a likely missed translation. It's advisory, not a hard gate: review each flagged value rather than assuming it's wrong.

## React migration (in progress)

- This app is being migrated from Vue to React. Both frameworks are installed and both Vite
  plugins are registered; a file is only ever handled by one of them (`.vue` by
  `@vitejs/plugin-vue`, `.tsx`/`.jsx` by the React plugin). Most of the app is still Vue — check
  what a file actually is before assuming.
- The React plugin is `@vitejs/plugin-react-swc`, not the default Babel one. That is deliberate:
  `vite-plugin-vue-devtools` pins `@babel/core` 7 while `@vitejs/plugin-react` wants 8, which
  cannot resolve while both frameworks are installed. Do not swap it back until Vue is gone. The
  plugin logs a recommendation to switch on every run; ignore it.
- New React components use Emotion (`@emotion/styled`) rather than a scoped `<style>` block, which
  has no React equivalent. Emotion is MUI's own styling engine, so adopting it now means MUI can
  land later without a second styling migration. The design tokens in `src/styles/base.css` are
  plain CSS custom properties and keep working unchanged.
- `src/react-bridge/` holds the migration scaffolding — currently `reactIsland`, which lets a Vue
  parent render a React component. It is temporary and gets deleted once `App.vue` is React. Do
  not build on it or extend it into a general interop layer.
- Convert components leaves first: a component whose children are its own concern can become an
  island, because a React root cannot render Vue-owned slot content.

## Style Conventions

- Use kebab-case for file names except for components (where the casing matters).
- Use the Arrange-Act-Assert (AAA) pattern for unit tests.

## Code and verification

- Use TypeScript and Vue's existing conventions.
- Keep components small and single-purpose. A `.vue` file should do one recognizable job — one screen, one card, one form, one row. Treat roughly 250 lines as the point at which a component should be split _before_ anything more is added to it, and treat the second copy of a piece of markup as the signal to extract it rather than duplicate it. Splitting an existing oversized component while you are working in it is expected, not optional.
- Compose components with a container that owns view-level state (e.g. computed phase/copy logic) and orchestrates side effects; children take that as props and emit events back up. A child with no such view-level state of its own may instead read app-lifetime shared state directly from the root store (`useRootStore()`, or a thin hook like `useTranslation()`) rather than have every field threaded through as a prop — see `GuestRegistrationForm.vue`, `GuestIdentityIndicator.vue`, and `GuestVisitStatus.vue`. Reach for props/emit first; reach into the store directly only for state that already lives there for the app's lifetime, not as a shortcut around passing data a container actually computes. Do not add a state-management library for this.
- "Avoid premature generalization" means don't invent abstractions for cases that don't exist yet. It does not mean leaving duplicated markup in place, and it does not mean keeping a component large — extracting something that already has two call sites is not premature.
- Whenever practical, implement business logic in separate services rather than alongside presentation code.
- Follow the repository formatter: tabs, single quotes, semicolons, and a 100-character print width. Run `npm run format` after edits when needed.
- The Vue app lives in `src/`; static assets live in `public/`; database schema code is in `db/`; and Netlify functions are in `netlify/functions/`.
- Netlify deploys every file in `netlify/functions/` as a function, and function names may only contain alphanumeric characters, hyphens, or underscores. Keep tests for those handlers in `netlify/test/functions/`; a colocated `name.test.ts` fails the deploy. Tests elsewhere, including `netlify/lib/` and `netlify/services/`, stay colocated.
- Within `src/`: shared components sit directly in `src/components/`, and components belonging to one feature go in a subfolder named for it (for example `src/components/admin/`). Frontend business logic goes in `src/services/`. CSS shared across components — anything a scoped `<style>` block cannot reach, since scoped styles do not apply inside child components — belongs in `src/styles/` and is imported once from `src/main.ts`.
- This is currently a Netlify-targeted application. Keep deployment configuration and server-side work compatible with the Netlify setup in `netlify.toml` and `netlify/`.
- Before creating or editing anything under `netlify/database/migrations/`, read `docs/migrations.md` and complete its pre-merge checklist. Migrations apply automatically to production on the next build — never merge or deploy a migration yourself; a human must review and merge it.
- TypeScript configuration is split by environment: `tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.vitest.json`, and `tsconfig.storybook.json` are referenced from `tsconfig.json`.
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
