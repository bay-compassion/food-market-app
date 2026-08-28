import { type Translation, translations } from '@/locales.ts';
import { makeReactive } from '@/services/make-reactive.ts';
import type { RootStore } from '@/services/root.store.ts';

export type Language = keyof typeof translations;

const supportedLanguages = Object.keys(translations) as Language[];

export class TranslationStore {
	locale: Language = 'en';
	language: Language = 'en';

	get translation(): Translation {
		return translations[this.locale];
	}

	get dir(): 'rtl' | 'ltr' {
		return ['ar', 'fa'].includes(this.locale) ? 'rtl' : 'ltr';
	}

	constructor(private readonly rootStore: RootStore) {
		this.locale = 'en';
		this.language = this.detectLanguage();

		return makeReactive(this);
	}

	setLanguage(language: Language): void {
		if (!supportedLanguages.includes(language)) {
			throw new RangeError('Unsupported language');
		}

		this.language = language;
		this.locale = language;
	}

	private detectLanguage(): Language {
		const language = navigator.language.split('-')[0] as Language;

		if (supportedLanguages.includes(language)) {
			return language;
		}

		return 'en';
	}
}
