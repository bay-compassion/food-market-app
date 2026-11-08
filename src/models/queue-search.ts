import type { QueueGuest } from '../services/admin-api.ts';
import { NameTag } from './name-tag.ts';
import { QueueNumber } from './queue-number.ts';

/** The fields of a ticket a volunteer can search the line by. */
export type QueueSearchable = Pick<
	QueueGuest,
	'id' | 'firstName' | 'lastName' | 'phone' | 'queuePosition' | 'priorityNumber'
>;

/** The fewest digits that are read as part of a phone number rather than a queue number. */
const phoneDigitsMinimum = 4;

/**
 * What a volunteer typed into the queue screen's search, and which tickets it finds.
 *
 * Every word has to match. A word that reads as a queue number — `12`, or `P2` in the priority
 * series — finds that number exactly, so `4` does not also bring up 14 and 40; it also finds a
 * reference code that starts with it. Any other word finds a name or a reference code containing
 * it. Case and accents are ignored, so `tomas` finds Tomás.
 *
 * A query of four digits or more, however it is punctuated — `0123`, `(510) 555-0123` — is a phone
 * number, and finds the guests whose number contains those digits: a guest at the desk often
 * gives the last four. It still finds a queue number or reference code too.
 */
export class QueueSearch {
	private readonly terms: string[];
	/** The query's digits, when the whole of it reads as a phone number. */
	private readonly phoneDigits: string | null;

	constructor(readonly query: string) {
		const digits = query.replace(/[\s().+-]/g, '');

		this.phoneDigits =
			/^[\d\s().+-]*$/.test(query) && digits.length >= phoneDigitsMinimum ? digits : null;
		this.terms = this.phoneDigits
			? [this.phoneDigits]
			: QueueSearch.fold(query).split(/\s+/).filter(Boolean);
	}

	/** Whether there is anything to search for. An empty or blank query finds every ticket. */
	get isActive(): boolean {
		return this.terms.length > 0;
	}

	matches(guest: QueueSearchable): boolean {
		const name = QueueSearch.fold(`${guest.firstName} ${guest.lastName}`);
		const number = QueueSearch.fold(QueueNumber.of(guest)?.label ?? '');
		const reference = QueueSearch.fold(NameTag.referenceOf(guest.id));

		if (this.phoneDigits && guest.phone.replace(/\D/g, '').includes(this.phoneDigits)) {
			return true;
		}

		return this.terms.every((term) =>
			QueueSearch.isNumber(term)
				? number === term || reference.startsWith(term)
				: name.includes(term) || reference.includes(term),
		);
	}

	/** `12` or `p2` — a word written the way a queue number is, once folded. */
	private static isNumber(term: string): boolean {
		return new RegExp(`^${QueueNumber.priorityPrefix.toLowerCase()}?\\d+$`).test(term);
	}

	/** Lower case without accents, so a search needn't match either. */
	private static fold(text: string): string {
		return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
	}
}
