# Bay Compassion contributor guide

## Product priorities

- This is primarily a mobile app. Design and implement for the mobile experience first; desktop responsiveness is not a requirement unless a task explicitly asks for it.
- Prefer clear, conventional, and small implementations. This project is maintained largely by novice developers working with agentic coding tools, so optimize for readability and low maintenance cost over clever abstractions or new dependencies.
- Make the smallest change that fully solves the request. Reuse the existing Vue, TypeScript, and project patterns before introducing a new pattern or library.

## Localization

- All user-facing text must be localized: labels, headings, buttons, validation and error messages, empty states, success messages, placeholders, and accessibility text.
- When adding or changing user-facing text, add or update its translation for **every** language listed in `packages/web/src/locales.ts` in the same change.
- Use the translation system in `packages/web/src/locales.ts`; do not leave hard-coded fallback text in components. Keep the `Translation` interface and every locale dictionary in sync.
- Preserve culturally appropriate scripts and writing direction for translated content. Do not translate proper names such as `The Bay Compassion` unless the product direction explicitly calls for it.

## Code and verification

- Use TypeScript and Vue's existing conventions. Keep components focused and avoid premature generalization.
- Follow the repository formatter: tabs, single quotes, semicolons, and a 100-character print width. Run `npm run format` after edits when needed.
- The repository is an npm-workspaces/Nx monorepo. App packages live in `packages/`; the Vue app is `packages/web`; database schema code is in `db/`; and Netlify functions are in `netlify/functions/`.
- This is currently a Netlify-targeted application. Keep deployment configuration and server-side work compatible with the Netlify setup in `netlify.toml` and `netlify/`.
- Packages extend the root TypeScript configuration. Use `npx plop package` to scaffold a new package from the repository template when a new package is needed.
- `oxlint` uses type-aware checks; treat warnings as worth resolving when they affect changed code. Conventional Commit messages are required, and the Husky pre-commit hook runs linting and formatting checks. Do not bypass hooks.
- The project uses Node 24 (see `.nvmrc`). A local Postgres instance is available through `docker compose up -d` when database work requires it.
- Before handing off a change, run the relevant checks. For web-app changes, prefer:

  ```bash
  npm run lint
  npm run format:check
  npm run test --workspaces --if-present
  npm --workspace web run build
  ```

- Do not modify unrelated files or overwrite existing user changes.
