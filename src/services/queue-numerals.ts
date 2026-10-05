import type { Locale } from '../locales.ts';

/**
 * How a queue number is written for one language: always in Western digits, which is what the
 * workers call out and every phone shows, and also in the language's own digits where it has them.
 *
 * Arabic and Farsi each have their own digits, and they are not the same set — Farsi writes 4, 5,
 * and 6 differently (۴۵۶ against ٤٥٦). A guest who reads only one of them can miss their number in
 * the other, so a display shows both rather than choosing.
 *
 * The numbering system is named explicitly: `Intl.NumberFormat('ar')` gives Western digits in some
 * runtimes and Eastern Arabic in others, depending on the CLDR version and region it settles on.
 */
export class QueueNumerals {
	private static readonly nativeSystems: Partial<Record<Locale, string>> = {
		ar: 'arab',
		fa: 'arabext',
	};

	private readonly native: Intl.NumberFormat | null;

	constructor(readonly locale: Locale) {
		const system = QueueNumerals.nativeSystems[locale];

		this.native = system
			? new Intl.NumberFormat(`${locale}-u-nu-${system}`, { useGrouping: false })
			: null;
	}

	get hasNativeDigits(): boolean {
		return this.native !== null;
	}

	/** The number in the language's own digits, or `null` when it writes them as Western digits. */
	nativeOf(value: number): string | null {
		return this.native?.format(value) ?? null;
	}

	/**
	 * For a number inside a sentence: both forms, the language's own first. Under `dir="auto"` that
	 * puts it where a right-to-left reader starts.
	 */
	inline(value: number): string {
		const native = this.nativeOf(value);

		return native === null ? String(value) : `${native} (${value})`;
	}
}
