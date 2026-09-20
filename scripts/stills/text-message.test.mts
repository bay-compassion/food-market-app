import { describe, expect, it } from 'vitest';

import { smsMessageParts } from '../../src/services/notification-copy.js';
import { textMessageHtml } from './text-message.mjs';

describe('textMessageHtml', () => {
	it('shades the prefix and the unsubscribe line, and nothing else, as required', () => {
		// Arrange
		const parts = smsMessageParts('en', 'called', null);

		// Act
		const html = textMessageHtml(parts, 'en');
		const required = [...html.matchAll(/<bdi dir="ltr" class="required">(.*?)<\/bdi>/g)].map(
			(match) => match[1],
		);

		// Assert
		expect(required).toEqual([parts.prefix, parts.unsubscribe]);
	});

	it('keeps the required English text left-to-right inside a right-to-left message', () => {
		// Arrange
		const parts = smsMessageParts('ar', 'called', null);

		// Act
		const html = textMessageHtml(parts, 'ar');

		// Assert
		expect(html).toContain('dir="rtl"');
		expect(html).toContain('<bdi dir="ltr" class="required">The Bay Compassion: </bdi>');
	});

	it('escapes wording a person wrote, since a broadcast is staff-authored', () => {
		// Arrange
		const parts = smsMessageParts('en', 'broadcast', null, {
			title: '<b>Update</b>',
			body: 'Doors & gates',
		});

		// Act
		const html = textMessageHtml(parts, 'en');

		// Assert
		expect(html).toContain('&lt;b&gt;Update&lt;/b&gt;');
		expect(html).toContain('Doors &amp; gates');
	});

	it('includes the place in line only when the message carries one', () => {
		// Arrange
		const selected = smsMessageParts('en', 'lottery_selected', 7);
		const called = smsMessageParts('en', 'called', 7);

		// Act
		const withPosition = textMessageHtml(selected, 'en');
		const without = textMessageHtml(called, 'en');

		// Assert
		expect(withPosition).toContain('Your position is 7.');
		expect(without).not.toContain('Your position is');
	});
});
