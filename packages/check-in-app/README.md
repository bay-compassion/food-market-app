# Compassion Food Market

The desktop app for the check-in iMac (this package, `@bay-compassion/check-in-app`). The goal is one window that is both the queue desk and the
print station, replacing the two Chrome windows the
[Check-In Launcher](../../docs/name-tag-printing.md#the-check-in-launcher) opens today.

**This is a spike.** Its one window holds the queue desk (`/queue`) with the print station
(`/printing-station`) in a panel down its right side, showing the station's status and the tags it
printed. It still has to be tried on the iMac and the LabelWriter before a market relies on it.

## How It Works

- **One window, two pages.** A `BaseWindow` holds two `WebContentsView`s, laid out by
  `CheckInWindow`: the queue desk, and a 360-pixel panel for the station, whose page is laid out for
  a phone. **Window → Show Printing Station** (Shift-Command-P) folds the panel away and back.
- **One sign-in.** The two pages share one session, so signing in at the queue desk signs the
  station in too. If the station started before anyone had signed in, its panel stays folded while
  it waits at the sign-in page, and it reloads once the queue desk comes back from signing in.
- **The station keeps running.** Folded or not, and with the window out of sight, it isn't slowed
  down, and the app keeps macOS's App Nap from slowing it. Closing the window only hides it; quit
  the app to stop the station.
- **Tags print silently.** The station's page asks the app to print (`window.checkInApp`, from the
  preload), and the app prints the page with `webContents.print({ silent: true })` on one label at
  the size the page names, with no margins, to the Mac's default printer or the one `printer`
  names. No print dialog, and no `--kiosk-printing` Chrome profile. `StationPrinter` waits for that
  print before moving on to the next tag, and tries a failed one again every three seconds. Only the
  station's page may print.
- **One copy only.** A second copy would run a second station, and every tag would print twice;
  opening the app again brings the running one forward.

## Developing

The main process (`src/main/`) and the preload (`src/preload/`) are TypeScript, compiled by
[electron-vite](https://electron-vite.org) into `out/`. Run `pnpm start` for the local app, then,
from the repository root:

```bash
pnpm --filter @bay-compassion/check-in-app dev
```

That opens the app against `http://localhost:8888`, and rebuilds and restarts it whenever a file
in `src/` changes. The first run downloads Electron, which `pnpm install` doesn't. A change to
`electron.vite.config.ts` or `package.json` needs `dev` started again.

### Configuration

Settings come from `config/`, read with [node-config](https://github.com/node-config/node-config):

| Key       | What it is                                                                    |
| --------- | ----------------------------------------------------------------------------- |
| `site`    | The app's origin. The window opens its `/queue`.                              |
| `signIn`  | The Auth0 sign-in page's origin, the only page a saved password is filled in. |
| `name`    | The app's name, which also names its data folder (see below).                 |
| `printer` | The printer tags go to, by its macOS queue name; `null` for the default.      |

`default.json` is production. `development.json` is a local `pnpm start` and the Auth0 tenant it
signs in through. `dev` uses `development` and a packaged app `production`; set `NODE_CONFIG_ENV`
to choose (`NODE_CONFIG_ENV=production pnpm --filter @bay-compassion/check-in-app dev`).

To override a value for one run, set `CHECK_IN_SITE`, `CHECK_IN_SIGN_IN` or `CHECK_IN_PRINTER`
(`custom-environment-variables.json`), or `NODE_CONFIG` with JSON. For your machine only, put
overrides in `config/local.json` or `config/local-development.json`, which git and the packaged app
both leave out.

The name keeps a development copy apart from the real app on the same Mac: each has its own data
folder in `~/Library/Application Support/`, so its own session, saved password, and one-copy lock.

The main process is built as CommonJS (`out/main/index.cjs`), not the ES module electron-vite would
make it in a `"type": "module"` package. node-config, which is bundled in, declares its own
top-level `require`, and that collides with the `require` shim electron-vite adds to ES module
output.

### The Saved Password

After a sign-in on Auth0's page succeeds, the app offers to save the email and password. The next
time that page asks, it fills them in; you still click Continue. **Compassion Food Market → Forget Saved
Password…** removes them.

They are stored in the app's data folder, encrypted with Electron's
[`safeStorage`](https://www.electronjs.org/docs/latest/api/safe-storage), whose key macOS keeps in
the login Keychain. The file is unreadable without that Keychain item. Because the app is signed ad
hoc, each new build is a different app to the Keychain: the first time one reads the password,
macOS asks whether it may, and **Always Allow** stops it asking again.

The preload (`src/preload/index.ts`) runs on every page, but the main process only answers Auth0's
sign-in page (`signIn`), so the password never reaches the app's own pages. Auth0's email page also
has an unnamed password field that only a password manager would fill, as a trap, so the preload
fills fields by name.

### The Icon

The icon is The Bay Compassion logo reversed, a white disc with the C and leaves in teal, on a teal
rounded square drawn to Apple's macOS app icon grid: an 824-point body 100 points in from the edge
of a 1024-point canvas, with a 185.4-point corner radius and a soft shadow. A current macOS shows an
icon that keeps to that grid as it is, rather than shrinking it onto a gray plate.

`resources/icon.icns` is what the packaged app carries, and `resources/icon.png` is what development
puts in the Dock. Both are generated from `public/bay-compassion-icon-digital.svg` and committed, so
building needs no Swift. After the logo changes, run this on a Mac with the Xcode command line tools
and commit the result:

```bash
pnpm --filter @bay-compassion/check-in-app icon
```

## Building

```bash
pnpm --filter @bay-compassion/check-in-app build
```

That compiles the app, then `package.ts` writes
`release/Compassion Food Market-darwin-universal/Compassion Food Market.app` and
`release/Compassion-Food-Market-universal.zip`: one app for
both Intel and Apple Silicon Macs. Add `arm64` or `x64` to build for one only, at half the size.
Only `package.json`, `out/`, and `config/` (without any `local*.json`) go into the app.

It needs macOS 13 (Ventura) or later, the floor of the `electron` devDependency's release. Keep that
release supported: the app holds a signed-in session with guest names and phone numbers.

## Trying It on the iMac

1. Make the LabelWriter the iMac's default printer, or name it in `printer`, and quit Chrome's
   print station if it is running: two stations would each print every tag.
1. Copy `release/Compassion-Food-Market-universal.zip` to the iMac and double-click it to unzip.
1. Move `Compassion Food Market.app` to Applications.
1. The first time, right-click it and choose **Open**, then **Open** again. It is signed ad hoc, not
   with an Apple Developer ID, so Gatekeeper asks once. On a recent macOS, if there is no Open
   button, go to **System Settings → Privacy & Security** and choose **Open Anyway**.
1. Sign in with the shared check-in account's email and password, and save the password when it
   offers. Not **Continue with Google**: Google refuses sign-in inside embedded browsers.
1. **Compassion Food Market → About Compassion Food Market** shows the Electron, Chromium, and macOS versions it is running on.

What to check:

- Sign-in comes back to the queue desk, and it stays signed in after **View → Reload** and after
  quitting and opening it again.
- The line loads and updates, and calling a guest works.
- The station's panel says Online, and **Print name tag** on a phone prints a tag on the LabelWriter
  with no dialog and shows up in the panel's list.
- If it quits at once, run
  `"/Applications/Compassion Food Market.app/Contents/MacOS/Compassion Food Market"` in Terminal and
  keep what it prints. `CHECK_IN_SITE=https://<deploy>` before that command points it at a preview
  deploy instead of production.

## What Comes Next

If it works on the iMac and the LabelWriter:

- Check a printed tag: that it runs along the label at full size, as `docs/name-tag-printing.md`
  asks of the Chrome station.
- Show a failing print in the station's panel; for now it is only retried.
- Retire the Check-In Launcher and its docs.
