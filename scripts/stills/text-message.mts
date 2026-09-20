import type { Locale } from '../../src/locales.js';
import type { SmsMessageParts } from '../../src/services/notification-copy.js';

function escapeHtml(value: string): string {
	return value.replace(
		/[&<>"]/g,
		(character) =>
			({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character] ?? character,
	);
}

/** Right-to-left languages, whose messages read from the right. */
const rightToLeft: ReadonlySet<Locale> = new Set<Locale>(['ar', 'fa']);

/**
 * A text message as a guest receives it, drawn as a page to be photographed like any other screen.
 *
 * The parts are the ones `smsMessage` joins, so the picture cannot disagree with what is sent. The
 * required parts are shaded and the wording that can be changed is not, with a key under the
 * message saying so — a reviewer should not have to know which is which.
 */
export function textMessageHtml(parts: SmsMessageParts, locale: Locale): string {
	const dir = rightToLeft.has(locale) ? 'rtl' : 'ltr';
	// Required text is English in every language, so it is kept left-to-right inside an RTL message.
	const required = (text: string) => `<bdi dir="ltr" class="required">${escapeHtml(text)}</bdi>`;
	const position = parts.position === null ? '' : `\n${escapeHtml(parts.position)}`;

	return `<!doctype html>
<html lang="${locale}" dir="${dir}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
	* { box-sizing: border-box; }
	body {
		margin: 0; padding: 28px 20px 32px; background: #fff; color: #111;
		font: 400 16px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif;
	}
	.kind { margin: 0 0 12px; color: #6b6b6b; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; }
	.bubble {
		max-width: 320px; padding: 12px 15px; border-radius: 20px; background: #e9e9eb;
		font-size: 17px; line-height: 1.4; white-space: pre-wrap; overflow-wrap: anywhere;
	}
	.required {
		padding: 1px 3px; border-radius: 3px; background: #ffd86b;
		-webkit-box-decoration-break: clone; box-decoration-break: clone;
	}
	.key { margin: 26px 0 0; padding: 0; list-style: none; display: grid; gap: 10px; font-size: 13px; color: #333; }
	.key li { display: flex; align-items: flex-start; gap: 10px; }
	.swatch { flex: none; width: 18px; height: 18px; margin-top: 1px; border: 1px solid #999; border-radius: 3px; background: #e9e9eb; }
	.swatch.required { background: #ffd86b; }
</style></head>
<body>
	<p class="kind">Text message</p>
	<div class="bubble">${required(parts.prefix)}${escapeHtml(parts.title)}\n\n${escapeHtml(parts.body)}${position}\n\n${required(parts.unsubscribe)}</div>
	<ul class="key">
		<li><span class="swatch required"></span><span><b>Required</b> on every text message. It is not optional and it is not translated.</span></li>
		<li><span class="swatch"></span><span>Wording that can be changed.</span></li>
	</ul>
</body></html>`;
}
