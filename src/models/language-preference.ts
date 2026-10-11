/**
 * Browsers report some languages under a code other than the one this app's translations use. A
 * phone set to Filipino says `fil`, which is the language the Tagalog translation serves.
 */
const ALIASES: Readonly<Record<string, string>> = { fil: 'tl' };

/** A BCP 47 tag as browsers write them (`es`, `zh-Hant-TW`). Anything else is not recorded. */
const VALID_TAG = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/;

/** How many of the browser's languages are recorded; past the first few, they say little. */
const RECORDED_LANGUAGES = 5;

/**
 * The languages a guest's browser asks for, in its order of preference, and which of them this app
 * can serve. It is what picks a first-time visitor's language before they choose one, and what
 * analytics records so that a language guests ask for but the app lacks shows up as a count.
 */
export class LanguagePreference<Code extends string> {
	private constructor(
		private readonly requested: readonly string[],
		private readonly supported: readonly Code[],
	) {}

	/** Reads `navigator.languages`, falling back to `navigator.language` where the list is empty. */
	static fromNavigator<Code extends string>(
		navigator: Pick<Navigator, 'language' | 'languages'>,
		supported: readonly Code[],
	): LanguagePreference<Code> {
		const requested = navigator.languages?.length ? navigator.languages : [navigator.language];

		return new LanguagePreference(
			requested.filter((tag) => typeof tag === 'string' && VALID_TAG.test(tag)),
			supported,
		);
	}

	/**
	 * The supported language the browser ranks highest, matched on the primary subtag — so
	 * `es-MX` is served Spanish — or `null` when it asks for none of them.
	 */
	get match(): Code | null {
		for (const tag of this.requested) {
			const primary = tag.split('-')[0]!.toLowerCase();
			const code = ALIASES[primary] ?? primary;

			if ((this.supported as readonly string[]).includes(code)) {
				return code as Code;
			}
		}

		return null;
	}

	/**
	 * The preference as analytics tags. Counting page loads where `browser_language_supported` is
	 * `false`, grouped by `browser_language`, is how a language worth adding shows up.
	 */
	get tags(): Record<string, string> {
		if (this.requested.length === 0) {
			return {};
		}

		return {
			browser_language: this.requested[0]!,
			browser_languages: this.requested.slice(0, RECORDED_LANGUAGES).join(','),
			browser_language_supported: String(this.match !== null),
		};
	}
}
