# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

This repo was bootstrapped from a personal template (`template-repo`) and is at an early stage. `packages/web2` (Vue 3) currently contains only a `package.json` and `tsconfig.json` — no source code yet. Don't assume application structure exists; check before referencing it.

## Repo structure

- npm workspaces + Nx monorepo. Root `package.json` declares `workspaces: ["packages/*"]`.
- `packages/<name>/` — one directory per package/app.
- `support/templates/package/` — Handlebars templates used by Plop to scaffold new packages (`package.json.hbs`, `tsconfig.json.hbs`, `support/setup.ts`, `vitest.config.ts`).
- Root `tsconfig.json` is a composite project referencing each package's `tsconfig.json`; every package's `tsconfig.json` extends the root one.

## Common commands

Run from the repo root unless noted.

```bash
npm run lint            # oxlint
npm run lint:fix        # oxlint --fix
npm run format           # oxfmt (write)
npm run format:check     # oxfmt --check
npm run test --workspaces --if-present   # run tests in every package that defines one (used by CI)
```

Within an individual package (once it has tests), Vitest is the test runner:

```bash
cd packages/<name>
npx vitest              # watch mode
npx vitest run          # single run (matches `test:ci` in scaffolded packages)
npx vitest run <file>   # single test file
```

### Scaffolding a new package

```bash
npx plop package
```

Prompts for a package name and generates it under `packages/<name>` from `support/templates/package/`.

## Tooling notes

- **Linting**: `oxlint` (see `oxlint.config.ts`). Type-aware linting is enabled (`typeAware`/`typeCheck`). `correctness` rules are set to `warn`; a handful of stylistic rules (`@stylistic/*`, `curly`, `eslint/no-unused-vars`) are `error`.
- **Formatting**: `oxfmt` (see `oxfmt.config.ts`) — tabs for indentation (per `.editorconfig`), single quotes, double quotes in JSX, 100-char print width, semicolons, sorted imports. `.hbs` files and a few build directories are excluded.
- **Editor defaults** (`.editorconfig`): tab indentation (size 4) everywhere except YAML and JSON (space, size 2).
- **Commits**: Conventional Commits, enforced by commitlint (`@commitlint/config-conventional`) via the Husky `commit-msg` hook.
- **Pre-commit hook** (Husky): runs `npm run lint` and `npm run format:check` — fix lint/format issues before committing, don't bypass with `--no-verify`.
- **Auto-format hook**: this repo's `.claude/settings.json` and `.codex/hooks.json` both run `npm run format` on any file Claude/Codex writes or edits (PostToolUse hook), so files are auto-formatted after edits.
- Node version is pinned via `.nvmrc` (24.15.0); CI (`.github/workflows/ci.yml`) uses it via `actions/setup-node`.
- A `docker-compose.yml` at the root defines a local Postgres instance (`postgres:latest`, exposed on 5432, user/password/db all `postgres`) — start with `docker compose up -d` if a package needs a database.

## CI

`.github/workflows/ci.yml` runs on push/PR to `main`: `npm ci`, then lint, format:check, and `npm run test --workspaces --if-present`. Keep changes passing all three before pushing.
