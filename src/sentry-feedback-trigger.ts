import type { FeedbackFormRequest } from './sentry-feedback.ts';
import { sentrySettings } from './sentry-settings.ts';

/** Whether this build offers the feedback form. Set with `VITE_SENTRY_FEEDBACK_ENABLED`. */
export const isFeedbackEnabled: boolean = sentrySettings(import.meta.env)?.feedbackEnabled ?? false;

/**
 * Opens the user feedback form, loading it first if this is the first time.
 *
 * Like replay, the form is its own chunk, and unlike replay it is not fetched until somebody asks
 * for it: most visits never open it, and none of them should pay for it on the way to the queue.
 * It opens nothing when `sentry.ts` has not started a client.
 */
export async function openFeedbackForm(request: FeedbackFormRequest): Promise<void> {
	const { showFeedbackForm } = await import('./sentry-feedback.ts');

	await showFeedbackForm(request);
}
