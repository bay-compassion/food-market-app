# Compassion Food Market (Desktop App)

The repository's root `AGENTS.md` applies here too; this adds what is particular to the desktop
app. See `README.md` for how the app works, builds, and releases.

## Bump the Version With Every Change That Ships

An installed copy only updates when a release carries a higher `version` than its own (see
"Updates" and "Releasing" in the README), so a change that reaches the app without a version bump
can never reach the iMac.

- Any change to what goes into the app — `src/`, `config/`, `resources/`, or `package.json`'s
  dependencies, `main`, or build settings — bumps `version` in this package's `package.json` in the
  same pull request.
- Bump once per release, not once per pull request. If the version on `main` has no
  `check-in-app-v<version>` tag yet (`git tag -l 'check-in-app-v*'`), it is still unreleased, and
  the change rides along in it.
- Follow semantic versioning: a patch for a fix, a minor for a new behavior or control, a major
  only for a change that needs every copy reinstalled by hand (a new signing certificate, for one).
- Documentation alone (`README.md`, this file) and `signing/` or `icon/` scripts that don't change
  the built app need no bump.
- Bumping the version doesn't release anything: tagging and publishing are a person's job, after
  the bump is merged (see "Releasing" in the README).
