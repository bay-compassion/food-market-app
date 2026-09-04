# Backend logging

The Netlify functions emit one JSON object per line to stdout using Winston. Logs are available in
Netlify's function logs; no external collector or credentials are required. Output goes directly to the console without a file or background network transport.

Set `LOG_LEVEL` in the server environment to `error`, `warn`, `info`, `http`, `verbose`, `debug`, `silly`, or
`silent`. The default is `info`; invalid values fall back to `info`. The setting is read when the
logger is initialized, so changing it requires a fresh function instance.

Every record includes `timestamp` (UTC ISO timestamp), `level`, and `service`. Within an invocation it
also includes `function` and `requestId`. The ID comes from Netlify's invocation context, or a fresh
UUID in local calls. Client-supplied request IDs are ignored. HTTP responses include `X-Request-Id`
for correlation; unexpected thrown errors remain under Netlify's response handling.

| Event                          | Fields                                                                                     | Level                              |
| ------------------------------ | ------------------------------------------------------------------------------------------ | ---------------------------------- |
| `http.completed`               | `method`, `path`, `status`, `durationMs`                                                   | info; warn for 4xx; error for 5xx  |
| `http.failed`                  | `method`, `path`, `status: 500`, `durationMs`, `err`                                       | error                              |
| `job.completed`                | `durationMs`                                                                               | info                               |
| `job.failed`                   | `durationMs`, `err`                                                                        | error                              |
| `notifications.disabled`       | —                                                                                          | debug                              |
| `notifications.delivered`      | `channel`, `sent`, `failed`, `skipped`                                                     | warn if any failed; otherwise info |
| `notification.delivery_failed` | `channel`, `deliveryId`, `attempt`, `providerCode` (SMS) or `providerStatus` (push), `err` | warn                               |

HTTP duration measures handler execution through response creation, not client download time.
There is one HTTP completion or failure record per handled request, including authentication,
validation, unknown-route, and body-limit responses. Platform rejections before function execution
cannot be logged here. Empty notification batches produce no delivery summary. The scheduled job
still emits a completion record when notifications are disabled. Delivery failures count unsuccessful
attempts, including deliveries that remain pending for retry.

## Adding service events

Import `getLogger` from `netlify/lib/logging.mjs` and log a stable `message` event name with operational
fields. AsyncLocalStorage carries invocation bindings across awaited work and concurrent delivery
calls without passing a logger through every service argument. Calls outside an invocation still
include the service identity, but no request ID.

```ts
getLogger().info({
	message: 'notifications.delivered',
	channel: 'sms',
	sent: 3,
	failed: 0,
	skipped: 1,
});
```

Do not log request/response objects, headers, bodies, query strings, guest identities, phone numbers,
credentials, subscription endpoints, or notification content. HTTP paths are restricted to known
registered paths; all others are recorded as `[unmatched]`. If parameterized routes are introduced,
log their route templates rather than concrete identifiers.

Use `err` for errors. The serializer includes the error type and stack frames, omitting messages,
causes, and arbitrary properties because database/provider errors can embed personal data and
credentials. Root request, response, and common sensitive fields are also removed as defense in
depth; this is not a recursive sanitizer for arbitrary payloads. Review new log fields accordingly.
Unexpected errors are rethrown unchanged to preserve Netlify invocation failure reporting; Netlify
may separately record the original exception outside this application logger.
