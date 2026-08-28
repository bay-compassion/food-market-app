import { beforeEach, describe, expect, it } from 'vitest';

import { translations } from '../locales.ts';
import { RootStore } from '../services/root.store.ts';
import { TranslationStore } from './translation.store.ts';

describe('TranslationStore', () => {
	let rootStore: RootStore;
	let store: TranslationStore;

	beforeEach(() => {
		rootStore = new RootStore();
		store = rootStore.translations;
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
});
