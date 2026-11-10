# Check-In App

A desktop app for the check-in iMac. The goal is one window that is both the queue desk and the
print station, replacing the two Chrome windows the
[Check-In Launcher](../../docs/name-tag-printing.md#the-check-in-launcher) opens today.

**This is a spike.** It opens `/queue` in one window and does nothing else yet. Its job is to show
that the queue desk signs in and runs in it on the iMac before the print station moves in.

## Developing

The main process is TypeScript in `src/main/`, compiled by
[electron-vite](https://electron-vite.org) into `out/main/`. From the repository root:

```bash
pnpm --filter @bay-compassion/check-in-app dev
```

That opens the app against production and rebuilds and restarts it whenever a file in `src/main/`
changes. Arguments after `--` go to Electron: `-- --site=http://localhost:8888` points it at
`pnpm start` (sign-in works there, since Auth0 allows that origin), and setting `CHECK_IN_SITE`
does the same. The first run downloads Electron, which `pnpm install` doesn't.

Keep the main process free of a top-level `await`: Electron holds `ready` back until an ES module
main has finished evaluating, so awaiting `app.whenReady()` there waits forever.

## Building

```bash
pnpm --filter @bay-compassion/check-in-app build
```

That compiles the main process, then `package.ts` writes
`release/Check-In-darwin-universal/Check-In.app` and `release/Check-In-universal.zip`: one app for
both Intel and Apple Silicon Macs. Add `arm64` or `x64` to build for one only, at half the size.
Only `package.json` and `out/` go into the app.

It needs macOS 13 (Ventura) or later, the floor of the `electron` devDependency's release. Keep that
release supported: the app holds a signed-in session with guest names and phone numbers.

The icon is The Bay Compassion logo, from `docs/check-in-launcher/icon.icns`.

## Trying It on the iMac

1. Copy `release/Check-In-universal.zip` to the iMac and double-click it to unzip.
2. Move `Check-In.app` to Applications.
3. The first time, right-click it and choose **Open**, then **Open** again. It is signed ad hoc, not
   with an Apple Developer ID, so Gatekeeper asks once. On a recent macOS, if there is no Open
   button, go to **System Settings → Privacy & Security** and choose **Open Anyway**.
4. Sign in with the shared check-in account's email and password. Not **Continue with Google**:
   Google refuses sign-in inside embedded browsers.
5. **Check-In → About Check-In** shows the Electron, Chromium, and macOS versions it is running on.

What to check:

- Sign-in comes back to the queue desk, and it stays signed in after **View → Reload** and after
  quitting and opening it again.
- The line loads and updates, and calling a guest works.
- If it quits at once, run `/Applications/Check-In.app/Contents/MacOS/Check-In` in Terminal and
  keep what it prints. `--site=https://<deploy>` after that command points it at a preview deploy
  instead of production.

## What Comes Next

If the spike works on the iMac:

- A hidden second window runs `/printing-station` in the same session, so one sign-in covers both,
  and the station keeps running at full speed while hidden.
- Tags print with `webContents.print({ silent: true })` to the LabelWriter by name, with the 30857
  paper size and no margins set in code. `StationPrinter` waits for that print when the app
  provides it, since a silent print finishes after the page has moved on.
- The shared password is kept in the iMac's Keychain (`safeStorage`) and filled in on the sign-in
  page.
- The Check-In Launcher and its docs are retired.
