import type { AdminTranslation } from '../adminLocales.ts';
import type { NotificationSeverity } from '../stores/notification.store.ts';

/**
 * The outcome of an admin action, as the store records it.
 *
 * The store deals in outcomes rather than in sentences: what a worker reads is decided here, by
 * `adminFeedbackText`, and how urgently by `adminFeedbackSeverity`.
 */
export type AdminFeedback =
	| { kind: 'error' }
	| { kind: 'saved' }
	| { kind: 'session-updated' }
	| { kind: 'draw-complete' }
	| { kind: 'no-waiting-guests' }
	| { kind: 'broadcast-queued'; recipients: number }
	| { kind: 'broadcast-no-recipients' }
	| { kind: 'demo-loaded' }
	/** `offersPhoneClaim` is whether the worker may hand this record to the guest's phone. */
	| { kind: 'guest-added'; guestId: string; name: string; offersPhoneClaim: boolean }
	/** This worker may not put that guest on a phone; a manager can. */
	| { kind: 'guest-claim-refused' };

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
		case 'guest-added':
			return t.guestAdded.replace('{name}', feedback.name);
		case 'guest-claim-refused':
			return t.guestClaimRefused;
	}
}

/** How a toast for an outcome is coloured: a failure, a completed action, or a note about nothing to do. */
export function adminFeedbackSeverity(feedback: AdminFeedback): NotificationSeverity {
	switch (feedback.kind) {
		case 'error':
			return 'error';
		case 'guest-claim-refused':
		case 'no-waiting-guests':
		case 'broadcast-no-recipients':
			return 'info';
		case 'saved':
		case 'session-updated':
		case 'draw-complete':
		case 'broadcast-queued':
		case 'demo-loaded':
		case 'guest-added':
			return 'success';
	}
}
