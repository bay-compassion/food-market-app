import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { translations } from '../locales.ts';
import { StorageKey } from '../services/storage.service.ts';
import { RootStore } from './root.store.ts';
import { TranslationStore } from './translation.store.ts';

describe('TranslationStore', () => {
	let rootStore: RootStore;
	let store: TranslationStore;

	beforeEach(() => {
		rootStore = new RootStore();
		store = rootStore.translations;
	});

	afterEach(() => {
		window.localStorage.clear();
		vi.unstubAllGlobals();
	});

	it('starts a first-time visitor in the first supported language their browser lists', () => {
		// Arrange
		vi.stubGlobal('navigator', { language: 'de-DE', languages: ['de-DE', 'fil-PH', 'en-US'] });

		// Act
		const detected = new TranslationStore(window.localStorage);

		// Assert
		expect(detected.locale).toBe('tl');
	});

	it('should have default locale', () => {
		// Arrange

		// Assert
		expect(store.locale).toBe('en');
	});

	it('updates translation and dir after setLanguage', () => {
		// Arrange

		// Act
		store.setLanguage('ar');

		// Assert
		expect(store.translation).toEqual(translations.ar);
		expect(store.dir).toBe('rtl');
	});

	it('persists the selected language to browser storage', () => {
		// Arrange

		// Act
		store.setLanguage('es');

		// Assert
		expect(window.localStorage.getItem(StorageKey.LOCALE)).toBe('es');
	});

	it('opens in a language saved from an earlier visit', () => {
		// Arrange
		window.localStorage.setItem(StorageKey.LOCALE, 'es');

		// Act
		const returningStore = new TranslationStore();

		// Assert
		expect(returningStore.locale).toBe('es');
	});

	it('ignores an unrecognized saved language', () => {
		// Arrange
		window.localStorage.setItem(StorageKey.LOCALE, 'klingon');

		// Act
		const returningStore = new TranslationStore();

		// Assert
		expect(returningStore.locale).toBe('en');
	});
});
