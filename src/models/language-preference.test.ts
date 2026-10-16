import { describe, expect, it } from 'vitest';

import { languages } from '../locales.ts';
import { LanguagePreference } from './language-preference';

const supported = languages.map(({ code }) => code);

function preference(languages: string[], language = languages[0] ?? '') {
	return LanguagePreference.fromNavigator({ language, languages }, supported);
}

describe('LanguagePreference', () => {
	it('matches a regional variant by its primary language', () => {
		// Arrange
		const browser = preference(['es-MX']);

		// Act
		const match = browser.match;

		// Assert
		expect(match).toBe('es');
	});

	it('serves Tagalog to a browser set to Filipino', () => {
		// Arrange
		const browser = preference(['fil-PH']);

		// Act
		const match = browser.match;

		// Assert
		expect(match).toBe('tl');
	});

	it('falls through to a later language when the first is unsupported', () => {
		// Arrange
		const browser = preference(['de-DE', 'de', 'es-US']);

		// Act
		const match = browser.match;

		// Assert
		expect(match).toBe('es');
	});

	it('has no match when the browser asks for no supported language', () => {
		// Arrange
		const browser = preference(['de-DE', 'ko-KR']);

		// Act
		const match = browser.match;

		// Assert
		expect(match).toBeNull();
	});

	it('reads navigator.language when the list is empty', () => {
		// Arrange
		const browser = LanguagePreference.fromNavigator(
			{ language: 'vi-VN', languages: [] },
			supported,
		);

		// Act
		const match = browser.match;

		// Assert
		expect(match).toBe('vi');
	});

	it('tags the first five languages the browser lists', () => {
		// Arrange
		const browser = preference(['ko-KR', 'ko', 'en-US', 'ja', 'zh-CN', 'fr']);

		// Act
		const tags = browser.tags;

		// Assert
		expect(tags).toEqual({
			browser_language: 'ko-KR',
			browser_languages: 'ko-KR,ko,en-US,ja,zh-CN',
			browser_language_supported: 'true',
		});
	});

	it('records support as false when nothing matches', () => {
		// Arrange
		const browser = preference(['ko-KR']);

		// Act
		const tags = browser.tags;

		// Assert
		expect(tags.browser_language_supported).toBe('false');
	});

	it('drops values that are not language tags', () => {
		// Arrange
		const browser = preference(['<script>', 'ko-KR', 'x'.repeat(40)]);

		// Act
		const tags = browser.tags;

		// Assert
		expect(tags.browser_languages).toBe('ko-KR');
	});
});
