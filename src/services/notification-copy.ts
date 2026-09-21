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

/** A text message broken into the pieces it is made of, so the required ones can be told apart. */
export type SmsMessageParts = {
	prefix: string;
	title: string;
	body: string;
	/** Only a lottery selection carries the guest's place in line. */
	position: string | null;
	unsubscribe: string;
};

export function smsMessageParts(
	locale: Locale,
	type: DeliveryType,
	queuePosition: number | null,
	custom?: CustomNotification,
): SmsMessageParts {
	const copy = deliveryCopy(locale, type, custom);
	const body =
		type === 'registration_confirmed'
			? translations[locale].smsNotificationRegisteredBody
			: copy.body;
	const position =
		type === 'lottery_selected' && queuePosition !== null
			? translations[locale].smsNotificationSelectedPosition.replace(
					'{position}',
					String(queuePosition),
				)
			: null;

	return { prefix: smsPrefix, title: copy.title, body, position, unsubscribe: smsUnsubscribe };
}

export function smsMessage(
	locale: Locale,
	type: DeliveryType,
	queuePosition: number | null,
	custom?: CustomNotification,
) {
	const { prefix, title, body, position, unsubscribe } = smsMessageParts(
		locale,
		type,
		queuePosition,
		custom,
	);

	return `${prefix}${title}\n\n${body}${position === null ? '' : `\n${position}`}\n\n${unsubscribe}`;
}
