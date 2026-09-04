import { adminTranslations } from '@/adminLocales.ts';
import { type Translation, translations } from '@/locales.ts';
import { makeReactive } from '@/services/make-reactive.ts';
import { StorageKey } from '@/services/storage.service.ts';

export type Language = keyof typeof translations;

const supportedLanguages = Object.keys(translations) as Language[];

export class TranslationStore {
	locale: Language = 'en';
	language: Language = 'en';

	get translation(): Translation {
		return translations[this.locale];
	}

	get adminTranslation() {
		return adminTranslations['en'];
	}

	get dir(): 'rtl' | 'ltr' {
		return ['ar', 'fa'].includes(this.locale) ? 'rtl' : 'ltr';
	}

	constructor(
		private readonly storage: Pick<Storage, 'getItem' | 'setItem'> = window.localStorage,
	) {
		this.locale = this.readSavedLanguage() ?? this.detectLanguage();
		this.language = this.locale;

		return makeReactive(this, { storage: false });
	}

	setLanguage(language: Language): void {
		if (!supportedLanguages.includes(language)) {
			throw new RangeError('Unsupported language');
		}

		this.language = language;
		this.locale = language;
		this.storage.setItem(StorageKey.LOCALE, language);
	}

	/** Bypasses `StorageService` — the saved value is a bare language code, not JSON, so it can be
	 *  read directly on a fresh visit, before there is a device to identify a returning one. */
	private readSavedLanguage(): Language | null {
		const saved = this.storage.getItem(StorageKey.LOCALE);

		return saved && supportedLanguages.includes(saved as Language) ? (saved as Language) : null;
	}

	private detectLanguage(): Language {
		const language = navigator.language.split('-')[0] as Language;

		if (supportedLanguages.includes(language)) {
			return language;
		}

		return 'en';
	}
}
