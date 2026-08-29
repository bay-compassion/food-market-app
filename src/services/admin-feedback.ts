import type { AdminTranslation } from '../adminLocales.ts';

/**
 * The outcome of an admin action, as the store records it.
 *
 * The store deals in outcomes rather than in sentences so it stays free of presentation: what a
 * worker reads is decided here, at the edge, by `adminFeedbackText`.
 */
export type AdminFeedback =
	| { kind: 'error' }
	| { kind: 'saved' }
	| { kind: 'session-updated' }
	| { kind: 'draw-complete' }
	| { kind: 'no-waiting-guests' }
	| { kind: 'broadcast-queued'; recipients: number }
	| { kind: 'broadcast-no-recipients' }
	| { kind: 'demo-loaded' };

/** What the dashboard shows for an outcome. */
export function adminFeedbackText(feedback: AdminFeedback | null, t: AdminTranslation): string {
	if (!feedback) {
		return '';
	}

	switch (feedback.kind) {
		case 'error':
			return t.error;
		case 'saved':
			return t.saved;
		case 'session-updated':
			return t.sessionUpdated;
		case 'draw-complete':
			return t.drawComplete;
		case 'no-waiting-guests':
			return t.noWaitingGuests;
		case 'broadcast-queued':
			return `${t.broadcastQueued} ${feedback.recipients}`;
		case 'broadcast-no-recipients':
			return t.broadcastNoRecipients;
		case 'demo-loaded':
			return t.devModeLoaded;
	}
}
