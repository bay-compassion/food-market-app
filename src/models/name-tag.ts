import type { Locale } from '../locales.ts';
import { QueueNumber, type QueueNumberSource } from './queue-number.ts';

/** The parts of a visit a name tag is made from. */
export type NameTagSource = QueueNumberSource & {
	/** The visit the tag is for. Its tail is the reference code that ties the sticker back to it. */
	visitId: string;
	/** When the tag is printed; the label shows its date. */
	printedAt: Date;
	firstName: string;
	lastName: string;
	/** How to say the name, as the guest or a worker wrote it. Absent or null when nobody has. */
	pronunciation?: string | null;
	locale: Locale;
};

/**
 * What goes on the sticker a check-in volunteer writes out for a guest they have just called: the
 * first name with a last initial, how to say it when someone wrote that down, their queue number,
 * the language they registered in, the day, and a short reference code for the visit.
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
	private static readonly longNameLength = 9;

	/** How many characters of the visit id the reference code keeps. */
	private static readonly referenceLength = 4;

	/** The label is read by English-speaking volunteers, like the rest of the queue desk. */
	private static readonly dateFormat = new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});

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

	/** How to say the name, so whoever reads the tag aloud gets it right; null when nobody wrote it. */
	get pronunciation(): string | null {
		return this.source.pronunciation?.trim() || null;
	}

	/** Whether the name needs the smaller type to fit the label. */
	get isLongName(): boolean {
		return this.name.length > NameTag.longNameLength;
	}

	/** The guest's queue number, or `null` for a visit the draw has not placed. */
	get number(): QueueNumber | null {
		return QueueNumber.of(this.source);
	}

	/**
	 * How long the number reads, for the type size that keeps it inside its block: `short` for up
	 * to two characters (`42`, `P1`), `medium` for three (`128`, `P12`), `long` for more.
	 */
	get numberLength(): 'short' | 'medium' | 'long' {
		const length = this.number?.label.length ?? 0;

		return length <= 2 ? 'short' : length === 3 ? 'medium' : 'long';
	}

	/**
	 * The last characters of a visit id, uppercased — `7F3A` — so a sticker can be matched to the
	 * visit it was printed for. Each visit has its own id, so a tag kept from an earlier session
	 * carries a code that matches none of today's visits. Not unique on its own; it narrows a day's
	 * visits to one. The queue lists show it next to each guest, to check a sticker against.
	 */
	static referenceOf(visitId: string): string {
		return visitId
			.replace(/[^0-9a-z]/gi, '')
			.slice(-NameTag.referenceLength)
			.toUpperCase();
	}

	/** This tag's reference code: see `NameTag.referenceOf`. */
	get reference(): string {
		return NameTag.referenceOf(this.source.visitId);
	}

	/** The day the tag was printed, e.g. `Oct 25, 2026`, in the printing device's time zone. */
	get date(): string {
		return NameTag.dateFormat.format(this.source.printedAt);
	}

	/** The registration language as a short code a volunteer can copy, e.g. `ES`. */
	get languageCode(): string {
		return this.source.locale.toUpperCase();
	}
}
