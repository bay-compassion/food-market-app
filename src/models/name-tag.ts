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
 * A value object built from the visit, so the screen that shows it and the label printer that
 * prints it agree on exactly the same text.
 */
export class NameTag {
	/**
	 * The label a tag prints on: a Dymo 30857 name badge, 4 × 2¼ in, die-cut on a roll for the
	 * LabelWriter 450 Twin Turbo, with the text running along its length. The one place the size is
	 * set — the screen draws the tag at these proportions too, so what a volunteer sees is what
	 * prints.
	 */
	static readonly label = { widthMm: 101.6, heightMm: 57.15 } as const;

	/** Names longer than this are set smaller, so they still fit across the label. */
	private static readonly longNameLength = 12;

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

	/** Whether the name needs the smaller type to fit the label. */
	get isLongName(): boolean {
		return this.name.length > NameTag.longNameLength;
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
