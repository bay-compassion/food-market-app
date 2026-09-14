import * as Sentry from '@sentry/react';

import type { FeedbackFormTranslations, Locale } from './locales';

/** What the app bar hands over when somebody asks to send feedback. */
export interface FeedbackFormRequest {
	text: FeedbackFormTranslations;
	locale: Locale;
	dir: 'ltr' | 'rtl';
}

/** The element `feedbackIntegration` creates to host its shadow DOM; this is its default `id`. */
const FEEDBACK_HOST_ID = 'sentry-feedback';

/**
 * The feedback integration, added to the running client the first time somebody opens the form —
 * in a module of its own so it lands in its own chunk. See `openFeedbackForm` in
 * `sentry-feedback-trigger.ts`.
 */
function feedbackIntegration() {
	if (!Sentry.getFeedback()) {
		Sentry.getClient()?.addIntegration(
			Sentry.feedbackIntegration({
				// The widget's own floating button would sit over a phone screen's primary actions.
				// The app bar menu opens the form instead.
				autoInject: false,
				showBranding: false,
				colorScheme: 'light',
				// A name is offered so a beta tester can be followed up with, but never required; email is
				// not asked for. The name is prefilled only in a build that runs `SentryUserReporter`,
				// from the `username` it sets.
				showName: true,
				isNameRequired: false,
				showEmail: false,
				// Screen capture is unavailable on every mobile browser, and on a desktop it would
				// photograph whatever guest details happen to be on screen.
				enableScreenshot: false,
				// Custom properties inherit through the shadow root, so the widget can use the app's
				// own tokens from `base.css` directly.
				themeLight: {
					foreground: 'var(--color-text)',
					background: 'var(--color-background)',
					accentForeground: 'var(--color-on-brand)',
					accentBackground: 'var(--color-brand)',
					successColor: 'var(--color-success)',
					errorColor: 'var(--color-error)',
				},
			}),
		);
	}

	return Sentry.getFeedback();
}

/**
 * Opens a fresh feedback form in the current language.
 *
 * The form is built on every open and removed on close, rather than built once and reused, because
 * its labels are fixed when it is created and a guest can change language between one open and the
 * next.
 */
export async function showFeedbackForm({ text, locale, dir }: FeedbackFormRequest): Promise<void> {
	const form = await feedbackIntegration()?.createForm({
		...text,
		// Neither of these is something a guest can act on differently from any other failure.
		errorNoClientText: text.errorGenericText,
		errorForbiddenText: text.errorGenericText,
		tags: { locale },
		onFormClose: () => form?.removeFromDom(),
		onFormSubmitted: () => form?.removeFromDom(),
	});

	if (!form) {
		return;
	}

	// The widget has no writing-direction option of its own, but its shadow tree inherits one from
	// the host element.
	const host = document.getElementById(FEEDBACK_HOST_ID);

	host?.setAttribute('dir', dir);
	host?.setAttribute('lang', locale);

	form.appendToDom();
	form.open();
}
