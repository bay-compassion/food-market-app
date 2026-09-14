import * as Sentry from '@sentry/node';
import Transport from 'winston-transport';

/**
 * Server-side Sentry for the Netlify functions: errors, logs, and traces, which is the part of
 * the free Developer plan that applies to a backend. `docs/observability.md` records the quotas
 * and what is deliberately left off.
 *
 * Sentry is inert with no `SENTRY_DSN` set, which is the case in local development and in the
 * unit tests.
 */

/** A sample rate from the environment, ignoring anything that is not a rate between 0 and 1. */
export function sampleRate(value: string | undefined, fallback: number): number {
	const parsed = Number(value);

	return value !== undefined && value !== '' && parsed >= 0 && parsed <= 1 ? parsed : fallback;
}

export type SentrySettings = {
	dsn: string;
	environment: string;
	release: string | undefined;
	tracesSampleRate: number;
};

/** What `Sentry.init` needs, or `null` when the environment has no DSN configured. */
export function sentrySettings(env: NodeJS.ProcessEnv = process.env): SentrySettings | null {
	const dsn = env.SENTRY_DSN;

	if (!dsn) {
		return null;
	}

	return {
		dsn,
		// Netlify sets `CONTEXT` to `production`, `deploy-preview`, or `branch-deploy`, which is
		// exactly the split that is worth filtering an issue list by.
		environment: env.SENTRY_ENVIRONMENT ?? env.CONTEXT ?? 'development',
		// `COMMIT_REF` is Netlify's build commit, so an issue points at the deploy that introduced it.
		release: env.SENTRY_RELEASE ?? env.COMMIT_REF,
		// A market runs for an hour at a time. Even a full sample of a busy session is a rounding
		// error against the free span allowance.
		tracesSampleRate: sampleRate(env.SENTRY_TRACES_SAMPLE_RATE, 1),
	};
}

const settings = sentrySettings();

/** Whether reports are going anywhere. Callers use it to skip work Sentry would only discard. */
export const sentryEnabled = settings !== null;

if (settings) {
	Sentry.init({
		dsn: settings.dsn,
		environment: settings.environment,
		release: settings.release,
		tracesSampleRate: settings.tracesSampleRate,
		// Guest names, phone numbers, and household details pass through these functions. None of
		// that belongs in a report: no IP addresses, no headers, no request bodies.
		sendDefaultPii: false,
		// The functions are bundled into a single ESM file, so there is no module graph left for
		// Sentry's loader hooks to patch. Spans come from `routeHandler` instead, and skipping the
		// hooks keeps them out of the cold start.
		registerEsmLoaderHooks: false,
	});
}

/**
 * The Winston transport that forwards log records to Sentry's log product, or `undefined` when
 * Sentry is not configured.
 *
 * Only warnings and errors are forwarded. Netlify's own function log already holds every record
 * at full fidelity, so what Sentry adds is one searchable place for the records worth waking up
 * for — and a log line is a fraction of the cost of an error event against the plan.
 *
 * This sits downstream of the logger's `sanitize` format, so the redaction that keeps phone
 * numbers and tokens out of stdout keeps them out of Sentry too.
 */
export function sentryWinstonTransport(): Transport | undefined {
	if (!settings) {
		return undefined;
	}

	const SentryWinstonTransport = Sentry.createSentryWinstonTransport(Transport, {
		levels: ['error', 'warn'],
	});

	return new SentryWinstonTransport();
}

/**
 * Hands anything queued to Sentry before the caller returns.
 *
 * A serverless runtime freezes the moment a response is written, taking any in-flight request
 * with it. Flushing is what makes the difference between an error that was captured and one that
 * was reported. With nothing queued this settles immediately; the timeout is what bounds the
 * delay a Sentry outage can add to a guest's response.
 */
export async function flushSentry(timeoutMs = 2000): Promise<void> {
	if (!settings) {
		return;
	}

	await Sentry.flush(timeoutMs);
}

/**
 * Runs a request handler as one Sentry server transaction, continuing the browser's trace when it
 * sent one so a slow page load and the request behind it are the same trace.
 *
 * `name` is the transaction name, so it must be the matched route rather than the raw URL — the
 * same reason `routeHandler` only logs registered paths.
 */
export async function tracedRequest(
	request: Request,
	name: string,
	handle: () => Promise<Response>,
): Promise<Response> {
	if (!settings) {
		return handle();
	}

	return Sentry.continueTrace(
		{
			sentryTrace: request.headers.get('sentry-trace') ?? undefined,
			baggage: request.headers.get('baggage'),
		},
		async () =>
			Sentry.startSpan({ name, op: 'http.server' }, async (span) => {
				try {
					const response = await handle();

					Sentry.setHttpStatus(span, response.status);

					return response;
				} catch (error) {
					Sentry.captureException(error);
					throw error;
				}
			}),
	);
}

/**
 * Runs a background job as one Sentry transaction. Async workloads arrive without a trace header,
 * so this starts a trace of its own rather than continuing one.
 */
export async function tracedJob(name: string, run: () => Promise<void>): Promise<void> {
	if (!settings) {
		return run();
	}

	return Sentry.startSpan({ name, op: 'function' }, async () => {
		try {
			await run();
		} catch (error) {
			Sentry.captureException(error);
			throw error;
		}
	});
}

/**
 * Wraps a Netlify async workload handler so a failure is reported and flushed.
 *
 * These run with nobody watching: a workload retries four times and then gives up, and the
 * notification it was delivering simply never goes out. They also arrive outside the HTTP
 * boundary, so there is no `routeHandler` to hang the reporting off.
 */
export function reportedWorkload<Event>(
	name: string,
	handle: (event: Event) => Promise<void>,
): (event: Event) => Promise<void> {
	return async (event) => {
		try {
			await tracedJob(name, () => handle(event));
		} finally {
			await flushSentry();
		}
	};
}
