import type { Locale } from '../locales.ts';

/** The parts of a visit a name tag is made from. */
export type NameTagSource = {
	firstName: string;
	lastName: string;
	queuePosition: number | null;
	locale: Locale;
};

/**
 * What goes on the sticker a check-in volunteer writes out for a guest they have just called: the
 * first name with a last initial, their place in line, and the language they registered in.
 *
 * A value object built from the visit, so the screen that shows it and — later — a label printer
 * that prints it agree on exactly the same text.
 */
export class NameTag {
	constructor(private readonly source: NameTagSource) {}

	/**
	 * "Maria G." — the first name in full, the last name cut to its initial. With no last name the
	 * first name stands alone rather than trailing a stray period.
	 */
	get name(): string {
		const first = this.source.firstName.trim();
		const initial = this.source.lastName.trim().charAt(0).toLocaleUpperCase();

		return initial ? `${first} ${initial}.` : first;
	}

	/** The place in line, or `null` for a visit the draw has not placed. */
	get position(): number | null {
		return this.source.queuePosition;
	}

	/** The registration language as a short code a volunteer can copy, e.g. `ES`. */
	get languageCode(): string {
		return this.source.locale.toUpperCase();
	}
}
