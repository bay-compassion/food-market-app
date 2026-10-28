# Home Screen Installation

After entering today's lottery, a guest can optionally add the market to their Home Screen.
`HomeScreenOffer` sits outside the visit card's live region. It is offered only while the guest's
visit is `registered`; it does not interrupt registration, ask for notification permission, or
change SMS consent. “Not Now” and dismissal of a native installation prompt hide the offer for
seven days on that browser. Demo guest previews disable installation.

`PwaInstallStore` captures `beforeinstallprompt` at app startup. The guest's tap calls `prompt()`
synchronously, while the browser still has user activation. Each captured event is used once;
`appinstalled` or standalone display mode hides the offer. Unsupported browsers have no button.
The existing manifest and service worker supply the installation metadata; the service worker
has no fetch handler and does not cache guest screens or API responses for offline use.

## OS Targeting in LaunchDarkly

Create one boolean flag, `guest-home-screen-install`, with client-side SDK availability enabled.
Keep its off variation and default rule false. The anonymous `user` context includes a coarse `os`
attribute: `android`, `ios`, or `other`. The SDK continues to generate its own anonymous key;
no guest identity, device credential, or app install ID is included.

Add targeting rules in LaunchDarkly for the same flag:

| Context Kind | Attribute | Operator  | Value     | Serve                    |
| ------------ | --------- | --------- | --------- | ------------------------ |
| `user`       | `os`      | is one of | `android` | `true` to enable Android |
| `user`       | `os`      | is one of | `ios`     | `true` to enable iOS     |

Enable either rule independently, or configure percentage rollouts for each rule. The SDK sends
`os` during initialization, so it is available for the first flag evaluation. You can type the
attribute name manually in the rule editor before it appears in autocomplete. See
[LaunchDarkly custom attributes](https://launchdarkly.com/docs/home/flags/custom-attributes).

The hook reads the one flag with a false fallback. Missing flags and disabled LaunchDarkly leave
the offer hidden. Desktop browsers remain excluded locally even if the flag evaluates to true.
Browser capability, registration status, and dismissal checks still apply.

Turning the flag off removes the offer and closes any open instructions without recording a guest
dismissal. Existing Home Screen apps and pending handoff restoration continue to work while the
flag is off. Storybook pins the evaluated flag value per story, independently of the real project.

## Safari on iPhone

Safari has no website-triggered install prompt. A bottom sheet explains Share → Add to Home Screen
→ Add → open the new icon. The last step finishes the storage handoff; the instructions never claim
that merely opening or dismissing the sheet installed anything.

Home Screen apps have separate localStorage. From iOS 17.2 onward, WebKit copies cookies into the
new app at installation, but does not copy localStorage. See
[WebKit's Safari 17.2 release notes](https://webkit.org/blog/14787/webkit-features-in-safari-17-2/).
The offer is limited to Safari with an identifiable iOS version of at least 17.2 and enabled cookies.
Older iPhones, embedded browsers, and iPads whose desktop user agent omits their OS version keep
the QR-code return path. The app's Safari 15.4 support floor is unchanged.

Before showing instructions, `HomeScreenHandoff` puts a snapshot of the existing guest and visit
credentials, local identity, household prefill, language, and introduction/tour preferences into a
one-hour cookie. It is scoped to `/pwa-start`, the manifest's static launch path, with `SameSite=Strict`
and `Secure` on HTTPS. No credential is placed in a URL. The cookie is not attached to `/api/` or
ordinary app paths. Oversized snapshots are refused instead of risking silent cookie truncation.

At `/pwa-start`, standalone mode consumes the cookie before constructing the stores. It restores only
allowlisted keys into an empty guest/visit storage area, rejects expired or malformed snapshots, and
rolls back partial writes. An existing guest or visit is never replaced. Changing or forgetting the
guest clears a pending handoff in the source browser; copies already installed in another storage
area have the same lifetime and access properties as the existing browser credentials. Installation
does not issue new credentials or change server authorization.

## Verification

- `src/stores/pwa-install.store.test.ts` covers native prompts, dismissal, installed mode, errors,
  cleanup, and clearing a pending handoff when the guest is forgotten.
- `src/pwa/home-screen-handoff.test.ts` covers expiration, malformed snapshots, Unicode data,
  existing identities, bounded cookies, blocked cookies, and partial storage failures.
- Storybook's **Guest / Visit / Add to Home Screen** covers instructions, native installation,
  dismissal, installed mode, and unsupported browsers without modifying global browser APIs.
- `pnpm run test:e2e e2e/home-screen-install.spec.ts` exercises the cookie path and a fresh browser
  context with copied cookies but empty localStorage. It verifies that startup restores the same
  guest and visit and removes the cookie. It simulates the documented OS copy boundary.

Before release, check installation on a physical iPhone running iOS 17.2 or later: enter the lottery,
add the icon, open it immediately, and confirm the same guest and visit appear. Also check dismissal,
reopening an existing icon, and the absence of the offer on iOS 15.4. Browser automation cannot
perform the operating system's Add to Home Screen action or verify its actual cookie copying.
