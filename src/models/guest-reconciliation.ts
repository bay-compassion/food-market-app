/** What reconciliation needs to know about one guest record. */
export type GuestIdentity = {
	guestId: string;
	firstName: string;
	lastName: string;
	/** Every normalized phone seen for the record: its current one and each visit's snapshot. */
	phones: readonly string[];
};

/**
 * Which guest records are the same household, and which are the same person.
 *
 * One person routinely holds several guest records: a visit a worker adds always creates a new
 * record, and so does a guest registering from a browser that no longer holds their device
 * credential. Counting records would count those people more than once.
 *
 * - **Households** are records linked by a shared phone, transitively — a record's own phone and
 *   every phone its visits were made with all count, so a number that changed still links.
 * - **People** are records within one household whose normalized first and last names match. A
 *   parent and adult child sharing a phone stay two people.
 *
 * The ids it hands out are only meaningful within one instance. They are opaque, and are not
 * stored anywhere; see `docs/data-warehousing.md`.
 */
export class GuestReconciliation {
	private readonly households = new Map<string, string>();
	private readonly people = new Map<string, string>();

	constructor(identities: Iterable<GuestIdentity>) {
		const records = [...identities];
		const links = new DisjointSets();

		for (const record of records) {
			links.add(record.guestId);

			for (const phone of record.phones) {
				links.union(record.guestId, `phone:${phone}`);
			}
		}

		// A set's root can be a phone key, so roots are swapped for ordinals rather than handed out.
		const householdIds = new Map<string, string>();
		const personIds = new Map<string, string>();

		for (const record of records) {
			const root = links.find(record.guestId);
			const household = householdIds.get(root) ?? `household-${householdIds.size + 1}`;
			const personKey = `${household}|${GuestReconciliation.nameKey(record) || record.guestId}`;
			const person = personIds.get(personKey) ?? `person-${personIds.size + 1}`;

			householdIds.set(root, household);
			personIds.set(personKey, person);
			this.households.set(record.guestId, household);
			this.people.set(record.guestId, person);
		}
	}

	/** Case, accents, and spacing are not differences between two people's names. */
	static nameKey({ firstName, lastName }: Pick<GuestIdentity, 'firstName' | 'lastName'>) {
		return `${firstName} ${lastName}`
			.normalize('NFKD')
			.replace(/\p{M}/gu, '')
			.toLocaleLowerCase()
			.replace(/\s+/g, ' ')
			.trim();
	}

	householdOf(guestId: string): string {
		return this.households.get(guestId) ?? guestId;
	}

	personOf(guestId: string): string {
		return this.people.get(guestId) ?? guestId;
	}
}

/** Union–find over string keys, with path compression. */
class DisjointSets {
	private readonly parents = new Map<string, string>();

	add(key: string) {
		if (!this.parents.has(key)) {
			this.parents.set(key, key);
		}
	}

	find(key: string): string {
		this.add(key);
		let root = key;

		while (this.parents.get(root) !== root) {
			root = this.parents.get(root)!;
		}

		for (let node = key; node !== root; ) {
			const parent = this.parents.get(node)!;

			this.parents.set(node, root);
			node = parent;
		}

		return root;
	}

	union(a: string, b: string) {
		const rootA = this.find(a);
		const rootB = this.find(b);

		if (rootA !== rootB) {
			this.parents.set(rootB, rootA);
		}
	}
}
