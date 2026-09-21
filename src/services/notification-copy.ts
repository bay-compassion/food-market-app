// `.js` rather than `.ts` on the import below: this file is read by the browser app, the Netlify
// functions (NodeNext), and the screenshots capture script, and `.js` is the one extension all three
// resolve to `locales.ts`.
import { translations, type Locale } from '../locales.js';

/** What a guest can be told about their visit. */
export const notificationTypes = [
	'registration_confirmed',
	'registration_closed',
	'lottery_selected',
	'lottery_not_selected',
	'called',
] as const;

export type NotificationType = (typeof notificationTypes)[number];
export type DeliveryType = NotificationType | 'broadcast';

/** Staff-written text for a broadcast, which has no translation of its own. */
export type CustomNotification = { title: string | null; body: string | null };

export function notificationCopy(locale: Locale, type: NotificationType) {
	const copy = translations[locale];
	const messages = {
		registration_confirmed: {
			title: copy.notificationRegisteredTitle,
			body: copy.notificationRegisteredBody,
		},
		registration_closed: {
			title: copy.notificationRegistrationClosedTitle,
			body: copy.notificationRegistrationClosedBody,
		},
		lottery_selected: {
			title: copy.notificationSelectedTitle,
			body: copy.notificationSelectedBody,
		},
		lottery_not_selected: {
			title: copy.notificationNotSelectedTitle,
			body: copy.notificationNotSelectedBody,
		},
		called: {
			title: copy.notificationCalledTitle,
			body: copy.notificationCalledBody,
		},
	} satisfies Record<NotificationType, { title: string; body: string }>;

	return messages[type];
}

export function deliveryCopy(locale: Locale, type: DeliveryType, custom?: CustomNotification) {
	return type === 'broadcast'
		? { title: custom?.title ?? '', body: custom?.body ?? '' }
		: notificationCopy(locale, type);
}

/**
 * The current prefix and opt-out instruction for every text message. This implementation still
 * leaves both in English; only STOP must remain in English when the instruction is localized.
 */
export const smsPrefix = 'The Bay Compassion: ';
export const smsUnsubscribe = 'Reply STOP to unsubscribe';

/**
 * The notifications a guest is also texted about. Registration confirmed and closed are push-only:
 * they tell a guest what they already know, and a text costs them data and attention.
 */
export const smsNotificationTypes = [
	'lottery_selected',
	'lottery_not_selected',
	'called',
	'broadcast',
] as const satisfies readonly DeliveryType[];

export type SmsNotificationType = (typeof smsNotificationTypes)[number];

export function isSmsNotificationType(type: string): type is SmsNotificationType {
	return (smsNotificationTypes as readonly string[]).includes(type);
}

/** What a text message can say: a queued notification, or the welcome sent when a guest consents. */
export type SmsMessageKind = SmsNotificationType | 'welcome';

/** A text message broken into the pieces it is made of, so the required ones can be told apart. */
export type SmsMessageParts = { prefix: string; text: string; unsubscribe: string };

function smsText(
	locale: Locale,
	kind: SmsMessageKind,
	queuePosition: number | null,
	custom?: CustomNotification,
) {
	const copy = translations[locale];

	switch (kind) {
		case 'welcome':
			return copy.smsNotificationWelcome;
		case 'lottery_selected':
			if (queuePosition === null) {
				throw new Error('A lottery selection text needs the guest’s queue position.');
			}

			return copy.smsNotificationSelected.replace('{position}', String(queuePosition));
		case 'lottery_not_selected':
			return copy.smsNotificationNotSelected;
		case 'called':
			return copy.smsNotificationCalled;
		case 'broadcast':
			return `${custom?.title ?? ''}: ${custom?.body ?? ''}`;
	}
}

export function smsMessageParts(
	locale: Locale,
	kind: SmsMessageKind,
	queuePosition: number | null,
	custom?: CustomNotification,
): SmsMessageParts {
	return {
		prefix: smsPrefix,
		text: smsText(locale, kind, queuePosition, custom),
		unsubscribe: smsUnsubscribe,
	};
}

export function smsMessage(
	locale: Locale,
	kind: SmsMessageKind,
	queuePosition: number | null,
	custom?: CustomNotification,
) {
	const { prefix, text, unsubscribe } = smsMessageParts(locale, kind, queuePosition, custom);

	return `${prefix}${text} ${unsubscribe}`;
}
