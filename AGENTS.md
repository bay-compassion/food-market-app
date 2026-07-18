# Bay Compassion contributor guide

## Product priorities

- This is primarily a mobile app. Design and implement for the mobile experience first; desktop responsiveness is not a requirement unless a task explicitly asks for it.
- Prefer clear, conventional, and small implementations. This project is maintained largely by novice developers working with agentic coding tools, so optimize for readability and low maintenance cost over clever abstractions or new dependencies.
- Make the smallest change that fully solves the request. Reuse the existing Vue, TypeScript, and project patterns before introducing a new pattern or library.

## Localization

- All user-facing text must be localized: labels, headings, buttons, validation and error messages, empty states, success messages, placeholders, and accessibility text.
- When adding or changing user-facing text, add or update its translation for **every** language listed in `src/locales.ts` in the same change.
- Use the translation system in `src/locales.ts`; do not leave hard-coded fallback text in components. Keep the `Translation` interface and every locale dictionary in sync.
- Preserve culturally appropriate scripts and writing direction for translated content. Do not translate proper names such as `The Bay Compassion` unless the product direction explicitly calls for it.

## Code and verification

- Use TypeScript and Vue's existing conventions. Keep components focused and avoid premature generalization.
- Whenever practical, implement business logic in separate services rather than alongside presentation code.
- Follow the repository formatter: tabs, single quotes, semicolons, and a 100-character print width. Run `npm run format` after edits when needed.
- The Vue app lives in `src/`; static assets live in `public/`; database schema code is in `db/`; and Netlify functions are in `netlify/functions/`.
- This is currently a Netlify-targeted application. Keep deployment configuration and server-side work compatible with the Netlify setup in `netlify.toml` and `netlify/`.
- TypeScript configuration is split by environment: `tsconfig.app.json`, `tsconfig.node.json`, and `tsconfig.vitest.json` are referenced from `tsconfig.json`.
- `oxlint` uses type-aware checks; treat warnings as worth resolving when they affect changed code.
- The project uses Node 24 (see `.nvmrc`).
- Before handing off a change, run the relevant checks. For web-app changes, prefer:

  ```bash
  npm run lint
  npm run format:check
  npm run test:unit -- --run
  npm run build
  ```

- Do not modify unrelated files or overwrite existing user changes.
