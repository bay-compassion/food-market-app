/**
 * What is wrong with a name. A code rather than a sentence: the guest's phone words it in their
 * language, and the server reports it back by the same name.
 */
export type GuestNameIssue = 'required' | 'initials-only';

/** A single cased letter — Latin, Cyrillic, Greek, and the like — standing for a whole word. */
const initial = /^[\p{Lu}\p{Ll}\p{Lt}]$/u;

/** Initials are written apart, with periods, or hyphenated: "J R", "J.R.", "J.-P.". */
const wordSeparators = /[\s.\-]+/u;

/**
 * One of the names a guest gives — first or last. Workers call a guest by name and print it on their
 * name tag, so a name has to be the name itself, not just its initials.
 *
 * A name is initials only when every word in it is a single cased letter, so "J", "J.", and "J. R."
 * are refused. Length is not the test: "Ng", "Le", and "Li" are whole surnames, and a single Han or
 * Hangul character such as "王" is a whole name, not an initial — those scripts have no case, so
 * they never match. "JR" with no periods is let through, since nothing tells it apart from "Al".
 *
 * A value object, free of MobX and the DOM: the registration form and the server both check a name
 * through it, so the two cannot disagree about what a name is.
 */
export class GuestName {
	constructor(private readonly input: string | null | undefined) {}

	get issue(): GuestNameIssue | null {
		const name = (this.input ?? '').trim();

		if (name === '') {
			return 'required';
		}

		const words = name.split(wordSeparators).filter((word) => word !== '');

		return words.length > 0 && words.every((word) => initial.test(word)) ? 'initials-only' : null;
	}

	get isValid(): boolean {
		return this.issue === null;
	}
}
