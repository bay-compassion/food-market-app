# Server and browser security boundaries

## HTTP requests and responses

`netlify/lib/http.mts` wraps each deployed Hono app once, outside its nested feature routers:

- Request bodies are limited to 32 KiB before route code or database access. Hono checks the
  platform-provided content length or, when absent, counts bytes while consuming the stream.
- JSON handlers require `Content-Type: application/json` (an optional charset is accepted).
  Other media types return `415`, malformed JSON returns `400`, and oversized bodies return `413`.
  The browser clients already send JSON; protocol errors use the clients' existing localized
  failure states rather than displaying the diagnostic response text.
- Every handled API response uses `Cache-Control: no-store`, including credentials, reports,
  validation failures, and authentication errors. Do not add shared caching to authenticated data.
- Hono's `secureHeaders` adds `nosniff`, frame denial, a no-referrer policy, and its other browser
  safety defaults. HSTS is left to Netlify, which also covers static content.
- `HEAD` returns `405` without running a GET handler. Unexpected exceptions still propagate to
  Netlify's invocation boundary so failures remain visible in platform logs.

CORS is intentionally **not enabled**: the UI and API share an origin. Rejecting form-compatible
content types closes the public-write path for cross-origin HTML forms. Non-browser clients can
still call the public API; CORS and content types are not authentication or bot protection.
Admin requests require a verified Auth0 bearer token and the route's permission; guest-specific
operations require their device or visit credential. The Auth0 JWKS resolver is reused across
warm invocations so jose can cache keys and throttle refreshes while still handling key rotation.

## Registration rate limiting

`netlify/functions/registration.mts` exposes only `/api/guest-information` and
`/api/lottery-registration`. Its Netlify rule permits 300 requests per 60 seconds per IP/domain,
then responds with `429`. Both paths use the same limit configuration; treat the budget as shared
when sizing traffic. This generous initial threshold accommodates guests on a shared Wi-Fi or
carrier network; it is an abuse backstop, not a per-person quota.

Polling and authenticated operations remain in `netlify/functions/api.mts`, which does not mount
the registration routes. Market polling happens every 5 seconds and visit polling every 15
seconds, so applying a low IP-based limit to all API routes could lock out an entire market.
Netlify's default DDoS protections remain in place for the site.

The rule is enforced by Netlify, not by an in-memory Hono counter (which would be unreliable across
serverless instances). It is not enforced by unit tests or the Vite development server. Netlify
documents an enforcement delay of up to 10 seconds. Inspect the rule in a deploy's summary, watch
real registration traffic and `429` responses, and adjust the threshold if shared-network guests
are affected. Do not load-test production registration with real guest data.

## Static-site headers and CSP rollout

`netlify.toml` supplies static responses with `nosniff`, frame denial, a no-referrer policy, and a
Permissions Policy disabling unused camera, microphone, geolocation, payment, and USB access.
Push notifications and service workers remain allowed. Netlify's static header rules do not apply
to function responses, which is why the Hono boundary also sets headers.

A small **enforced** CSP blocks embedding, plugins, and off-origin base URLs. The full CSP is
**report-only** until it has been exercised against the deployed app. It currently allows the
Auth0 tenant domains, Google Fonts, Emotion's inline styles, HTTPS profile images, and the Auth0
worker. If using an Auth0 custom domain, replace the Auth0 wildcard with that exact origin in
`connect-src` and `frame-src`. Prefer the exact configured tenant origin before full enforcement.

The report-only policy does not yet block scripts or collect remote violation reports; review its
messages in the browser console. Do not interpret its presence as completed XSS protection.
Before promoting the full policy to enforcement, verify on a deploy preview:

1. Guest registration, return visits, cancel, and localized failure states.
2. Auth0 login, logout, callback, and silent token renewal; admin reports and CSV downloads.
3. Fonts, responsive styles, profile images, and legal/SMS-consent pages.
4. Push permission, service-worker registration, and subscription on supported phones.
5. The document response has both CSP headers; API successes and `401`/`413`/`415` responses have
   `no-store` and `nosniff`; cross-origin preflights have no `Access-Control-Allow-Origin`.
6. Both Netlify HTTP functions appear in the deploy and the registration rate-limit rule is
   present. The custom `/api/admin/*` paths must return API responses, not the SPA HTML fallback.

## References

- [Hono secure headers](https://hono.dev/docs/middleware/builtin/secure-headers)
- [Hono body limit](https://hono.dev/docs/middleware/builtin/body-limit)
- [Netlify custom headers](https://docs.netlify.com/manage/routing/headers/)
- [Netlify rate limiting](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/)
